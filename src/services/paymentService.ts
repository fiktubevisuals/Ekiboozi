import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Campaign } from '../types';

export interface PesapalOrderResult {
  redirectUrl: string;
  orderTrackingId: string;
  reference: string;
  donationId: string;
}

export interface PesapalVerificationResult {
  isCompleted: boolean;
  status: string;
  amount?: number;
  confirmationCode?: string;
  paymentMethod?: string;
  donation?: any;
  alreadyRecorded?: boolean;
  error?: string;
}

/**
 * Initiates a donation with Pesapal.
 * CRITICAL: This ONLY creates a 'pending' transaction record.
 * It NEVER increments the campaign's raised amount or donor count at this stage!
 */
export async function initiateDonationPayment(
  campaign: Campaign,
  amount: number,
  donorName: string,
  donorEmail: string,
  userId: string | null
): Promise<PesapalOrderResult> {
  if (isNaN(amount) || amount < 1000) {
    throw new Error('Donation amount must be at least 1,000 UGX.');
  }

  const cleanReference = `DON-${campaign.id.substring(0, 6)}-${Date.now()}`;

  // 1. Create a strictly PENDING donation record
  const donationRef = await addDoc(collection(db, 'donations'), {
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    amount,
    currency: 'UGX',
    donorName: donorName.trim() || 'Kind Supporter',
    donorEmail: donorEmail.trim() || '',
    donorId: userId || null,
    reference: cleanReference,
    status: 'pending', // NEVER mark 'completed' before gateway verification!
    createdAt: new Date().toISOString(),
    timestamp: serverTimestamp(),
  });

  // 2. Call backend Pesapal order submission
  try {
    const response = await fetch('/api/pesapal/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        description: `Donation to: ${campaign.title.slice(0, 60)}`,
        reference: cleanReference,
        donorName: donorName.trim() || 'Kind Supporter',
        email: donorEmail.trim() || undefined
      })
    });

    const data = await response.json();

    if (!response.ok || !data.redirect_url) {
      // Mark as failed in DB so it doesn't linger as pending
      await updateDoc(doc(db, 'donations', donationRef.id), {
        status: 'failed',
        failureReason: data.error || 'Payment gateway connection failed'
      });
      throw new Error(data.error || 'Unable to initiate Pesapal payment checkout.');
    }

    // Attach tracking ID to pending record
    await updateDoc(doc(db, 'donations', donationRef.id), {
      orderTrackingId: data.order_tracking_id
    });

    return {
      redirectUrl: data.redirect_url,
      orderTrackingId: data.order_tracking_id,
      reference: cleanReference,
      donationId: donationRef.id
    };
  } catch (err: any) {
    // If network error occurred, ensure status reflects failure
    try {
      await updateDoc(doc(db, 'donations', donationRef.id), {
        status: 'failed',
        failureReason: err.message || 'Network exception'
      });
    } catch {
      // ignore
    }
    throw err;
  }
}

/**
 * Verifies with Pesapal whether a payment has actually completed.
 * ONLY when Pesapal returns isCompleted=true does it:
 * 1. Mark the donation document as 'completed'.
 * 2. Increment campaign.raised and campaign.donorsCount.
 */
export async function verifyAndRecordDonation(
  orderTrackingId: string,
  providedDonationId?: string
): Promise<PesapalVerificationResult> {
  if (!orderTrackingId) {
    return { isCompleted: false, status: 'Invalid tracking ID' };
  }

  // 1. Query Pesapal server for live status
  const res = await fetch(`/api/pesapal/status?order_tracking_id=${encodeURIComponent(orderTrackingId)}`);
  const statusData = await res.json();

  if (!res.ok || !statusData) {
    return {
      isCompleted: false,
      status: statusData?.status || 'Error',
      error: statusData?.error || 'Failed to verify transaction status with Pesapal.'
    };
  }

  const isCompleted = Boolean(statusData.isCompleted);

  // 2. Locate the donation in Firestore
  let donationDocSnap: any = null;
  if (providedDonationId) {
    const dRef = doc(db, 'donations', providedDonationId);
    const snap = await (await import('firebase/firestore')).getDoc(dRef);
    if (snap.exists()) {
      donationDocSnap = snap;
    }
  }

  if (!donationDocSnap) {
    const q = query(collection(db, 'donations'), where('orderTrackingId', '==', orderTrackingId));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      donationDocSnap = querySnap.docs[0];
    }
  }

  if (!donationDocSnap) {
    return {
      isCompleted,
      status: statusData.verifiedStatus || 'Not Found',
      error: 'Donation transaction record not found in system.'
    };
  }

  const donationData = donationDocSnap.data();

  // If already completed, do not double-increment!
  if (donationData.status === 'completed') {
    return {
      isCompleted: true,
      status: 'Completed',
      alreadyRecorded: true,
      amount: donationData.amount,
      donation: donationData
    };
  }

  // 3. If Pesapal confirmed completion: RECORD AND UPDATE CAMPAIGN
  if (isCompleted) {
    const verifiedAmount = Number(donationData.amount) || 0;

    // A. Update donation record
    await updateDoc(doc(db, 'donations', donationDocSnap.id), {
      status: 'completed',
      completedAt: new Date().toISOString(),
      timestamp: serverTimestamp(),
      confirmationCode: statusData.confirmation_code || '',
      paymentMethod: statusData.payment_method || 'Pesapal'
    });

    // B. Atomically increment public campaign total
    if (donationData.campaignId && verifiedAmount > 0) {
      const campaignRef = doc(db, 'campaigns', donationData.campaignId);
      await updateDoc(campaignRef, {
        raised: increment(verifiedAmount),
        donorsCount: increment(1)
      });
    }

    return {
      isCompleted: true,
      status: 'Completed',
      amount: verifiedAmount,
      confirmationCode: statusData.confirmation_code,
      paymentMethod: statusData.payment_method,
      donation: { ...donationData, status: 'completed' }
    };
  } else {
    // If failed or cancelled
    const rawStatus = (statusData.payment_status_description || '').toLowerCase();
    if (rawStatus === 'failed' || rawStatus === 'invalid' || rawStatus === 'reversed') {
      await updateDoc(doc(db, 'donations', donationDocSnap.id), {
        status: 'failed',
        failureReason: statusData.payment_status_description || 'Payment failed on Pesapal'
      });
    }

    return {
      isCompleted: false,
      status: statusData.verifiedStatus || statusData.payment_status_description || 'Pending',
      error: 'Payment has not been completed. No funds have been added to the campaign goal.'
    };
  }
}

/**
 * Reconciles all campaign raised totals based strictly on completed donations.
 * Useful for admin audit to ensure no uncompleted payments ever inflate numbers.
 */
export async function reconcileCampaignTotals(): Promise<{ updated: number; message: string }> {
  const campaignsSnap = await getDocs(collection(db, 'campaigns'));
  const donationsSnap = await getDocs(collection(db, 'donations'));

  const verifiedTotals: Record<string, { total: number; count: number }> = {};

  donationsSnap.forEach(d => {
    const data = d.data();
    if (data.status === 'completed' && data.campaignId) {
      if (!verifiedTotals[data.campaignId]) {
        verifiedTotals[data.campaignId] = { total: 0, count: 0 };
      }
      verifiedTotals[data.campaignId].total += Number(data.amount) || 0;
      verifiedTotals[data.campaignId].count += 1;
    }
  });

  let updatedCount = 0;
  for (const c of campaignsSnap.docs) {
    const verified = verifiedTotals[c.id] || { total: 0, count: 0 };
    const current = c.data();
    if (current.raised !== verified.total || current.donorsCount !== verified.count) {
      await updateDoc(doc(db, 'campaigns', c.id), {
        raised: verified.total,
        donorsCount: verified.count
      });
      updatedCount++;
    }
  }

  return {
    updated: updatedCount,
    message: `Reconciliation complete. ${updatedCount} campaigns synchronized with verified completed payments.`
  };
}
