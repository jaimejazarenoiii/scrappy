# Supabase Real-time Setup Instructions

## 🚀 Setting Up Real-time Database

Your junkshop management system now has **real-time database synchronization** with Supabase! Here's how to set it up:

### 1. **Apply Database Schema**

Go to your Supabase project dashboard:
1. Navigate to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase/migrations/20250120_initial_schema.sql`
3. Paste and **RUN** the SQL script

This will create:
- ✅ **6 tables** with proper relationships
- ✅ **Row Level Security (RLS)** policies
- ✅ **Real-time subscriptions** enabled
- ✅ **Demo data** for testing

### 2. **Tables Created**

| Table | Purpose | Real-time |
|-------|---------|-----------|
| `profiles` | User profiles extending auth.users | ✅ |
| `employees` | Employee management | ✅ |
| `transactions` | Buy/sell transactions | ✅ |
| `transaction_items` | Individual items in transactions | ✅ |
| `cash_entries` | Cash management entries | ✅ |
| `cash_advances` | Employee cash advances | ✅ |

### 3. **Real-time Features**

🔄 **Automatic Sync**: Changes sync instantly across all devices
📱 **Multi-device**: Works on phones, tablets, computers simultaneously  
🔒 **Secure**: Row Level Security ensures users only see appropriate data
⚡ **Live Updates**: See changes as they happen in real-time

### 4. **Authentication Setup**

The system now works with Supabase Auth! Here's how to set it up:

#### **Create Demo Users in Supabase Auth:**

1. **Go to Authentication → Users** in your Supabase dashboard
2. **Click "Invite a User"** and create these accounts:

**Owner Account:**
- Email: `owner@scrappy.com`
- Password: `password123`
- User Metadata: `{"name": "John Owner", "role": "owner"}`

**Employee Account:**  
- Email: `employee@scrappy.com`
- Password: `password123`
- User Metadata: `{"name": "Jane Employee", "role": "employee"}`

#### **Automatic Profile Creation:**
The schema includes a trigger that automatically creates a profile in the `profiles` table when a user signs up. The user's role and name are taken from the metadata.

### 5. **Testing Real-time**

1. **Open two browser windows** with your app
2. **Login with different accounts** (or same account)
3. **Make changes** in one window (add transaction, employee, etc.)
4. **Watch the other window** update automatically! ✨

### 6. **Status Indicator**

Look for the real-time status in the top-right corner:
- 🟢 **Live**: Connected and syncing
- 🔴 **Offline**: No internet connection
- ⏰ **Last sync time**: Shows when data was last updated

### 7. **Production Notes**

For production deployment:
- Replace demo users with real authentication
- Set up proper email verification
- Configure custom RLS policies as needed
- Set up backup strategies

## 🎉 **You're All Set!**

Your junkshop management system now has **enterprise-grade real-time database functionality**! 

**Multiple employees can now:**
- ✅ Work simultaneously without conflicts
- ✅ See each other's transactions in real-time
- ✅ Collaborate on inventory management
- ✅ Access up-to-date reports instantly

**Try it out**: Open the app on multiple devices and watch the magic happen! 🪄
