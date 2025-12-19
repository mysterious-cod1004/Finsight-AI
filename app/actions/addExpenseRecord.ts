'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

interface RecordData {
  text: string;
  amount: number;
  category: string;
  date: string;
}

interface RecordResult {
  data?: RecordData;
  error?: string;
}

async function addExpenseRecord(formData: FormData): Promise<RecordResult> {
  const textValue = formData.get('text');
  const amountValue = formData.get('amount');
  const categoryValue = formData.get('category');
  const dateValue = formData.get('date');

  // 1. Basic Validation
  if (!textValue || !amountValue || !categoryValue || !dateValue) {
    return { error: 'One or more required fields are missing.' };
  }

  const text = textValue.toString();
  const amount = parseFloat(amountValue.toString());
  const category = categoryValue.toString();

  // 2. Date Processing
  let date: string;
  try {
    const [year, month, day] = dateValue.toString().split('-');
    const dateObj = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0));
    date = dateObj.toISOString();
  } catch (err) {
    return { error: 'Invalid date format provided.' };
  }

  // 3. Authentication
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return { error: 'Authentication failed. User not found.' };
  }

  const email = user.emailAddresses[0].emailAddress;

  try {
    // 4. USER SYNC (Upsert)
    try {
      await db.user.upsert({
        where: { clerkUserId: userId },
        update: { email },
        create: {
          clerkUserId: userId,
          email: email,
        },
      });
    } catch (upsertError: any) {
      // P2002: Unique constraint failed (Email already exists on another clerkUserId)
      if (upsertError.code === 'P2002') {
        await db.user.update({
          where: { email: email },
          data: { clerkUserId: userId },
        });
      } else {
        throw upsertError;
      }
    }

    // 5. Create the Record
    // Now that the user is definitely synced, we create the expense
    const createdRecord = await db.record.create({
      data: {
        text,
        amount,
        category,
        date,
        userId, 
      },
    });

    const recordData: RecordData = {
      text: createdRecord.text,
      amount: createdRecord.amount,
      category: createdRecord.category,
      date: createdRecord.date?.toISOString() || date,
    };

    revalidatePath('/');
    return { data: recordData };

  } catch (error: any) {
    console.error('❌ Error in addExpenseRecord:', error);
    return { error: 'An unexpected database error occurred.' };
  }
}

export default addExpenseRecord;