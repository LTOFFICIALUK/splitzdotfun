import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Respond to an offer (accept, reject, counter)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      responseType,
      counterAmount,
      responseMessage,
      responderUserId,
      transactionSignature,
      buyerWalletAddress
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    if (!responseType || !responderUserId) {
      return NextResponse.json(
        { success: false, error: 'Response type and responder user ID are required' },
        { status: 400 }
      );
    }

    if (!['accept', 'reject', 'counter'].includes(responseType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid response type' },
        { status: 400 }
      );
    }

    // Get the offer with listing details
    const { data: offer, error: fetchError } = await supabase
      .from('marketplace_offers')
      .select(`
        *,
        marketplace_listings (
          id,
          seller_user_id,
          is_active,
          listing_price,
          tokens (
            id,
            name,
            symbol,
            contract_address,
            owner_user_id
          )
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !offer) {
      return NextResponse.json(
        { success: false, error: 'Offer not found' },
        { status: 404 }
      );
    }

    // Check if offer is still pending
    if (offer.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Offer is no longer pending' },
        { status: 400 }
      );
    }

    // Check if offer has expired
    if (new Date() > new Date(offer.expires_at)) {
      return NextResponse.json(
        { success: false, error: 'Offer has expired' },
        { status: 400 }
      );
    }

    // Check if listing is still active
    if (!offer.marketplace_listings.is_active) {
      return NextResponse.json(
        { success: false, error: 'Listing is no longer active' },
        { status: 400 }
      );
    }

    // Validate responder is the seller
    if (offer.marketplace_listings.seller_user_id !== responderUserId) {
      return NextResponse.json(
        { success: false, error: 'Only the seller can respond to offers' },
        { status: 403 }
      );
    }

    // Validate counter offer amount if countering
    if (responseType === 'counter') {
      if (!counterAmount || counterAmount <= 0) {
        return NextResponse.json(
          { success: false, error: 'Counter amount must be greater than 0' },
          { status: 400 }
        );
      }

      if (counterAmount <= offer.offer_amount) {
        return NextResponse.json(
          { success: false, error: 'Counter amount must be higher than the original offer' },
          { status: 400 }
        );
      }
    }

    // Create response record
    const { data: response, error: responseError } = await supabase
      .from('offer_responses')
      .insert({
        offer_id: id,
        response_type: responseType,
        counter_amount: counterAmount || null,
        response_message: responseMessage || null,
        responder_user_id: responderUserId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (responseError) {
      console.error('Error creating response:', responseError);
      return NextResponse.json(
        { success: false, error: 'Failed to create response' },
        { status: 500 }
      );
    }

    // Handle different response types
    let updatedOffer;
    let sale = null;

    if (responseType === 'accept') {
      // Validate payment if transaction signature is provided
      if (transactionSignature && buyerWalletAddress) {
        const paymentVerification = await verifyOfferPayment(
          transactionSignature,
          buyerWalletAddress,
          offer.marketplace_listings.seller_user_id,
          offer.offer_amount
        );

        if (!paymentVerification.success) {
          return NextResponse.json(
            { success: false, error: paymentVerification.error },
            { status: 400 }
          );
        }
      }

      // Accept the offer - create sale and update offer
      const { data: acceptedOffer, error: acceptError } = await supabase
        .from('marketplace_offers')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (acceptError) {
        console.error('Error accepting offer:', acceptError);
        return NextResponse.json(
          { success: false, error: 'Failed to accept offer' },
          { status: 500 }
        );
      }

      updatedOffer = acceptedOffer;

      // Process the sale
      const saleResult = await processOfferSale(offer, transactionSignature);

      if (!saleResult.success) {
        // Rollback offer status
        await supabase
          .from('marketplace_offers')
          .update({
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        return NextResponse.json(
          { success: false, error: saleResult.error },
          { status: 500 }
        );
      }

      sale = saleResult.sale;

      // Deactivate the listing
      await supabase
        .from('marketplace_listings')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', offer.listing_id);

      // Reject all other pending offers on this listing
      await supabase
        .from('marketplace_offers')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('listing_id', offer.listing_id)
        .eq('status', 'pending')
        .neq('id', id);

    } else if (responseType === 'reject') {
      // Reject the offer
      const { data: rejectedOffer, error: rejectError } = await supabase
        .from('marketplace_offers')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (rejectError) {
        console.error('Error rejecting offer:', rejectError);
        return NextResponse.json(
          { success: false, error: 'Failed to reject offer' },
          { status: 500 }
        );
      }

      updatedOffer = rejectedOffer;

    } else if (responseType === 'counter') {
      // Counter the offer
      const { data: counteredOffer, error: counterError } = await supabase
        .from('marketplace_offers')
        .update({
          status: 'countered',
          counter_amount: counterAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (counterError) {
        console.error('Error countering offer:', counterError);
        return NextResponse.json(
          { success: false, error: 'Failed to counter offer' },
          { status: 500 }
        );
      }

      updatedOffer = counteredOffer;
    }

    // Create notifications
    await createOfferResponseNotifications(offer, responseType, responderUserId, counterAmount);

    return NextResponse.json({
      success: true,
      data: {
        offer: updatedOffer,
        response: response,
        sale: sale
      }
    });

  } catch (error) {
    console.error('Error responding to offer:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to verify offer payment
async function verifyOfferPayment(
  transactionSignature: string,
  buyerWalletAddress: string,
  sellerUserId: string,
  offerAmount: number
) {
  try {
    // Initialize Solana connection
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

    // Get transaction details
    const transaction = await connection.getTransaction(transactionSignature, {
      commitment: 'confirmed'
    });

    if (!transaction) {
      return { success: false, error: 'Transaction not found' };
    }

    // Verify transaction amount matches offer amount
    if (!transaction.meta?.postBalances || !transaction.meta?.preBalances) {
      return { success: false, error: 'Transaction metadata is incomplete' };
    }
    
    const transactionAmount = transaction.meta.postBalances[0] - transaction.meta.preBalances[0];
    const expectedAmount = offerAmount * LAMPORTS_PER_SOL;

    if (Math.abs(transactionAmount) < expectedAmount * 0.99) { // Allow 1% tolerance
      return { success: false, error: 'Transaction amount does not match offer amount' };
    }

    // Verify transaction is confirmed
    if (transaction.meta.err) {
      return { success: false, error: 'Transaction failed' };
    }

    return { success: true };

  } catch (error) {
    console.error('Error verifying offer payment:', error);
    return { success: false, error: 'Failed to verify payment' };
  }
}

// Helper function to process offer sale
async function processOfferSale(offer: any, transactionSignature?: string) {
  try {
    // Calculate platform fee (10% of offer amount)
    const platformFee = offer.offer_amount * 0.1;
    const sellerAmount = offer.offer_amount - platformFee;

    // Create marketplace sale record
    const { data: sale, error: saleError } = await supabase
      .from('marketplace_sales')
      .insert({
        token_id: offer.marketplace_listings.tokens.id,
        seller_user_id: offer.marketplace_listings.seller_user_id,
        buyer_user_id: offer.buyer_user_id,
        sale_price_sol: offer.offer_amount,
        sale_type: 'offer_accepted',
        payment_method: 'sol',
        transaction_status: 'completed',
        transaction_signature: transactionSignature || null,
        sale_time: new Date().toISOString(),
        source_offer_id: offer.id,
        platform_fee_lamports: Math.floor(platformFee * LAMPORTS_PER_SOL),
        seller_amount_lamports: Math.floor(sellerAmount * LAMPORTS_PER_SOL)
      })
      .select()
      .single();

    if (saleError) {
      console.error('Error creating sale record:', saleError);
      return { success: false, error: 'Failed to create sale record' };
    }

    // Record platform revenue
    const { error: revenueError } = await supabase
      .from('platform_revenue')
      .insert({
        revenue_type: 'sale_fee',
        amount_lamports: Math.floor(platformFee * LAMPORTS_PER_SOL),
        amount_sol: platformFee,
        source_sale_id: sale.id,
        source_token_id: offer.marketplace_listings.tokens.id,
        status: 'collected',
        collected_at: new Date().toISOString()
      });

    if (revenueError) {
      console.error('Error recording platform revenue:', revenueError);
      // Don't fail the sale for revenue recording errors
    }

    // Update token ownership (transfer to buyer)
    const { error: ownershipError } = await supabase
      .from('tokens')
      .update({
        owner_user_id: offer.buyer_user_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', offer.marketplace_listings.tokens.id);

    if (ownershipError) {
      console.error('Error updating token ownership:', ownershipError);
      return { success: false, error: 'Failed to transfer token ownership' };
    }

    // Update royalty shares for ownership transfer
    // Get current royalty agreement and update it for the new owner
    const { data: currentAgreement, error: agreementError } = await supabase
      .from('royalty_agreement_versions')
      .select(`
        id,
        platform_fee_bps,
        royalty_agreement_version_shares (
          earner_wallet,
          bps
        )
      `)
      .eq('token_id', offer.marketplace_listings.tokens.id)
      .is('effective_to', null)
      .single();

    if (!agreementError && currentAgreement) {
      // Call centralized royalty share update for ownership transfer
      const royaltyShares = currentAgreement.royalty_agreement_version_shares.map((share: any) => ({
        earner_wallet: share.earner_wallet,
        bps: share.bps,
        role: 'Earner', // Default role
        is_manager: false // Default manager status
      }));

      const royaltyUpdateResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/royalty-shares/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          token_id: offer.marketplace_listings.tokens.id,
          royalty_shares: royaltyShares,
          platform_fee_bps: currentAgreement.platform_fee_bps,
          updated_by_user_id: offer.buyer_user_id,
          reason: 'ownership_transfer'
        })
      });

      if (!royaltyUpdateResponse.ok) {
        console.error('❌ Error updating royalty shares for ownership transfer');
        // Don't fail the sale for royalty update errors
      } else {
        console.log('✅ Royalty shares updated for ownership transfer');
      }
    }

    return { success: true, sale };

  } catch (error) {
    console.error('Error processing offer sale:', error);
    return { success: false, error: 'Failed to process offer sale' };
  }
}

// Helper function to create offer response notifications
async function createOfferResponseNotifications(
  offer: any,
  responseType: string,
  responderUserId: string,
  counterAmount?: number
) {
  try {
    // Get responder username
    const { data: responder, error: responderError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', responderUserId)
      .single();

    const responderUsername = responder?.username || 'Unknown User';

    // Create notification for buyer
    let notificationTitle = '';
    let notificationMessage = '';

    switch (responseType) {
      case 'accept':
        notificationTitle = 'Offer Accepted!';
        notificationMessage = `${responderUsername} accepted your offer of ${offer.offer_amount} SOL`;
        break;
      case 'reject':
        notificationTitle = 'Offer Rejected';
        notificationMessage = `${responderUsername} rejected your offer of ${offer.offer_amount} SOL`;
        break;
      case 'counter':
        notificationTitle = 'Counter Offer Received';
        notificationMessage = `${responderUsername} countered your offer with ${counterAmount} SOL`;
        break;
    }

    await supabase
      .from('notifications')
      .insert({
        user_id: offer.buyer_user_id,
        type: `offer_${responseType}`,
        title: notificationTitle,
        message: notificationMessage,
        data: {
          offer_id: offer.id,
          response_type: responseType,
          counter_amount: counterAmount,
          responder_user_id: responderUserId,
          responder_username: responderUsername
        },
        read: false,
        created_at: new Date().toISOString()
      });

  } catch (error) {
    console.error('Error creating offer response notifications:', error);
    // Don't fail the response for notification errors
  }
}
