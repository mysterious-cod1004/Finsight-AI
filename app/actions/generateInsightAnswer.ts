'use server';

import { checkUser } from '@/lib/checkUser';
import { db } from '@/lib/db';
import { generateExpenseInsights, ExpenseRecord } from '@/lib/ai';

export async function getAIInsights() {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user's recent expenses (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const expenses = await db.record.findMany({
      where: {
        userId: user.clerkUserId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // FIX: Added explicit type (expense: any) or (expense: ExpenseRecord) to satisfy the compiler
    const expenseData: ExpenseRecord[] = expenses.map((expense: any): ExpenseRecord => ({
      id: expense.id,
      amount: expense.amount,
      category: expense.category || 'Other',
      description: expense.text || '', // Ensure this matches your Record model field (text vs description)
      date: expense.createdAt.toISOString(),
    }));

    const insights = await generateExpenseInsights(expenseData);
    return { data: insights };
  } catch (error) {
    console.error('❌ Error getting AI insights:', error);
    return { error: 'Failed to fetch AI insights' };
  }
}