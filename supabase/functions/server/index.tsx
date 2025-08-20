import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'jsr:@supabase/supabase-js'
import * as kv from './kv_store.tsx'

const app = new Hono()

// CORS and logging middleware
app.use('*', cors({
  origin: '*',
  credentials: true,
}))
app.use('*', logger(console.log))

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// User signup endpoint
app.post('/make-server-9ec0e10b/auth/signup', async (c) => {
  try {
    const { email, password, name, role } = await c.req.json()
    
    // Validate role
    if (!['owner', 'employee'].includes(role)) {
      return c.json({ error: 'Invalid role. Must be owner or employee' }, 400)
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        name,
        role
      },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    })

    if (error) {
      console.log('Signup error:', error)
      return c.json({ error: `Signup failed: ${error.message}` }, 400)
    }

    // Store additional user profile data in KV store
    await kv.set(`user_profile_${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      role,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    })

    return c.json({ 
      message: 'User created successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        name,
        role
      }
    })
  } catch (error) {
    console.log('Server error during signup:', error)
    return c.json({ error: 'Internal server error during signup' }, 500)
  }
})

// User signin endpoint (returns user profile with role)
app.post('/make-server-9ec0e10b/auth/signin', async (c) => {
  try {
    const { email, password } = await c.req.json()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.log('Signin error:', error)
      return c.json({ error: `Authentication failed: ${error.message}` }, 401)
    }

    // Get user profile from KV store
    const userProfile = await kv.get(`user_profile_${data.user.id}`)
    
    if (!userProfile) {
      console.log('User profile not found:', data.user.id)
      return c.json({ error: 'User profile not found' }, 404)
    }

    // Update last login
    await kv.set(`user_profile_${data.user.id}`, {
      ...userProfile,
      last_login: new Date().toISOString()
    })

    return c.json({
      message: 'Authentication successful',
      session: data.session,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: userProfile.name,
        role: userProfile.role
      }
    })
  } catch (error) {
    console.log('Server error during signin:', error)
    return c.json({ error: 'Internal server error during authentication' }, 500)
  }
})

// User signout endpoint
app.post('/make-server-9ec0e10b/auth/signout', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Access token required' }, 401)
    }

    // Get user info before signing out
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(accessToken)
    
    if (getUserError || !user) {
      console.log('User lookup error during signout:', getUserError)
      // Still return success as the token is invalid anyway
      return c.json({ message: 'Signed out successfully' })
    }

    // Sign out the user from Supabase auth
    const { error: signOutError } = await supabase.auth.admin.signOut(accessToken)
    
    if (signOutError) {
      console.log('Supabase signout error:', signOutError)
      // Continue anyway as we want to clear local session
    }

    // Update user profile with logout timestamp
    try {
      const userProfile = await kv.get(`user_profile_${user.id}`)
      if (userProfile) {
        await kv.set(`user_profile_${user.id}`, {
          ...userProfile,
          last_logout: new Date().toISOString()
        })
      }
    } catch (profileError) {
      console.log('Profile update error during signout:', profileError)
      // Non-critical error, continue
    }

    return c.json({ 
      message: 'Signed out successfully',
      user_id: user.id
    })
  } catch (error) {
    console.log('Server error during signout:', error)
    return c.json({ error: 'Internal server error during signout' }, 500)
  }
})

// Get user profile endpoint
app.get('/make-server-9ec0e10b/auth/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Access token required' }, 401)
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (error || !user) {
      console.log('Token validation error:', error)
      return c.json({ error: 'Invalid or expired token' }, 401)
    }

    // Get user profile from KV store
    const userProfile = await kv.get(`user_profile_${user.id}`)
    
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404)
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: userProfile.name,
        role: userProfile.role,
        last_login: userProfile.last_login
      }
    })
  } catch (error) {
    console.log('Server error getting profile:', error)
    return c.json({ error: 'Internal server error getting user profile' }, 500)
  }
})

// Transaction endpoints with role-based access
app.get('/make-server-9ec0e10b/transactions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Access token required' }, 401)
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized access' }, 401)
    }

    // Get user profile to check role
    const userProfile = await kv.get(`user_profile_${user.id}`)
    
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404)
    }

    // Get transactions based on role
    let transactions = []
    
    if (userProfile.role === 'owner') {
      // Owners can see all transactions
      const allTransactions = await kv.getByPrefix('transaction_')
      transactions = allTransactions || []
    } else if (userProfile.role === 'employee') {
      // Employees can only see their own transactions
      const employeeTransactions = await kv.getByPrefix(`transaction_employee_${user.id}_`)
      transactions = employeeTransactions || []
    }

    return c.json({ transactions })
  } catch (error) {
    console.log('Server error getting transactions:', error)
    return c.json({ error: 'Internal server error getting transactions' }, 500)
  }
})

// Save transaction endpoint with role checks
app.post('/make-server-9ec0e10b/transactions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Access token required' }, 401)
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized access' }, 401)
    }

    const userProfile = await kv.get(`user_profile_${user.id}`)
    
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404)
    }

    const transaction = await c.req.json()
    
    // Add user info to transaction
    transaction.created_by = user.id
    transaction.created_by_name = userProfile.name
    transaction.created_by_role = userProfile.role
    transaction.created_at = new Date().toISOString()

    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    transaction.id = transactionId

    // Save transaction with appropriate key structure
    const key = userProfile.role === 'employee' 
      ? `transaction_employee_${user.id}_${transactionId}`
      : `transaction_${transactionId}`
    
    await kv.set(key, transaction)

    return c.json({ 
      message: 'Transaction saved successfully',
      transaction_id: transactionId,
      transaction 
    })
  } catch (error) {
    console.log('Server error saving transaction:', error)
    return c.json({ error: 'Internal server error saving transaction' }, 500)
  }
})

// Initialize demo users endpoint (for development/demo purposes)
app.post('/make-server-9ec0e10b/auth/init-demo-users', async (c) => {
  try {
    const demoUsers = [
      {
        email: 'owner@scrappy.com',
        password: 'password123',
        name: 'Maria Santos',
        role: 'owner'
      },
      {
        email: 'employee@scrappy.com',
        password: 'password123',
        name: 'Carlos Reyes',
        role: 'employee'
      }
    ];

    const results = [];

    for (const user of demoUsers) {
      // Check if user already exists
      const existingProfile = await kv.getByPrefix(`user_profile_`);
      const userExists = existingProfile?.some(profile => profile.email === user.email);

      if (!userExists) {
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          user_metadata: { 
            name: user.name,
            role: user.role
          },
          email_confirm: true
        });

        if (error) {
          console.log(`Error creating user ${user.email}:`, error);
          results.push({ email: user.email, status: 'error', error: error.message });
        } else {
          // Store user profile
          await kv.set(`user_profile_${data.user.id}`, {
            id: data.user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            created_at: new Date().toISOString(),
            last_login: null
          });

          results.push({ email: user.email, status: 'created', id: data.user.id });
        }
      } else {
        results.push({ email: user.email, status: 'exists' });
      }
    }

    return c.json({ message: 'Demo users initialization complete', results });
  } catch (error) {
    console.log('Server error initializing demo users:', error);
    return c.json({ error: 'Internal server error initializing demo users' }, 500);
  }
});

// Update transaction endpoint with role checks
app.put('/make-server-9ec0e10b/transactions/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    
    if (!accessToken) {
      return c.json({ error: 'Access token required' }, 401)
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized access' }, 401)
    }

    const userProfile = await kv.get(`user_profile_${user.id}`)
    
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404)
    }

    const transactionId = c.req.param('id')
    const updates = await c.req.json()

    // Check if transaction exists and user has permission
    let existingTransaction = null
    
    if (userProfile.role === 'owner') {
      // Owners can access any transaction
      existingTransaction = await kv.get(`transaction_${transactionId}`) ||
                           await kv.get(`transaction_employee_${user.id}_${transactionId}`)
    } else if (userProfile.role === 'employee') {
      // Employees can only access their own transactions
      existingTransaction = await kv.get(`transaction_employee_${user.id}_${transactionId}`)
      
      // Employees cannot edit completed transactions
      if (existingTransaction && existingTransaction.status === 'completed') {
        return c.json({ error: 'Employees cannot edit completed transactions' }, 403)
      }
    }

    if (!existingTransaction) {
      return c.json({ error: 'Transaction not found or access denied' }, 404)
    }

    // Update transaction
    const updatedTransaction = {
      ...existingTransaction,
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
      updated_by_name: userProfile.name
    }

    // Save with same key structure
    const key = userProfile.role === 'employee' 
      ? `transaction_employee_${user.id}_${transactionId}`
      : `transaction_${transactionId}`
    
    await kv.set(key, updatedTransaction)

    return c.json({ 
      message: 'Transaction updated successfully',
      transaction: updatedTransaction 
    })
  } catch (error) {
    console.log('Server error updating transaction:', error)
    return c.json({ error: 'Internal server error updating transaction' }, 500)
  }
})

Deno.serve(app.fetch)