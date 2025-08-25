import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// DELETE - Clear all notifications for a user
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Delete all notifications for the user
    const { data: deletedNotifications, error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (error) {
      console.error('Error clearing notifications:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to clear notifications' },
        { status: 500 }
      );
    }

    const deletedCount = deletedNotifications?.length || 0;

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        message: `Successfully cleared ${deletedCount} notifications`
      }
    });

  } catch (error) {
    console.error('Error in clear all notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
