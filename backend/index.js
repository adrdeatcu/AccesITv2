const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ Supabase with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

let latestScannedEmployee = null;

// ✅ TEMPORARY FLAG used by ESP32 to open gate
let temporaryFreeAccess = false;

// AES256 Configuration
const AES_KEY= process.env.AES_KEY;// Ensure this is a base64 encoded 32-byte key
const ALGORITHM = 'aes-256-cbc';

// Create proper key buffer
const keyBuffer = Buffer.from(AES_KEY, 'base64').subarray(0, 32);

// Fixed AES Encryption function
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return iv.toString('base64') + ':' + encrypted;
}

// Fixed AES Decryption function
function decrypt(encryptedData) {
  try {
    console.log('Encrypted data received:', encryptedData);
    
    const textParts = encryptedData.split(':');
    if (textParts.length !== 2) {
      console.error('Invalid encrypted data format');
      return null;
    }
    
    const iv = Buffer.from(textParts[0], 'base64');
    const encryptedText = textParts[1];
    
    console.log('IV length:', iv.length);
    console.log('Encrypted text length:', encryptedText.length);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log('Decryption successful');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

// Health check
app.get('/', (req, res) => {
  res.send('API is running');
});

// ✅ Bluetooth access from mobile with AES256 encryption
app.post('/verify-access-from-mobile', async (req, res) => {
  console.log('📨 Received encrypted request on /verify-access-from-mobile');
  console.log('📡 Request body:', req.body);

  const { encrypted_data } = req.body;
  if (!encrypted_data) {
    return res.status(400).json({
      encrypted_response: encrypt(JSON.stringify({
        granted: false,
        message: 'Invalid request: missing encrypted_data'
      }))
    });
  }

  const decryptedData = decrypt(encrypted_data);
  if (!decryptedData) {
    return res.status(400).json({
      encrypted_response: encrypt(JSON.stringify({
        granted: false,
        message: 'Invalid encryption or corrupted data'
      }))
    });
  }

  let parsedData;
  try {
    parsedData = JSON.parse(decryptedData);
  } catch (error) {
    return res.status(400).json({
      encrypted_response: encrypt(JSON.stringify({
        granted: false,
        message: 'Invalid JSON format'
      }))
    });
  }

  const { ble_code, direction, type } = parsedData;
  const validatedById = 'c302e64d-601c-4cc2-895d-09648c83bbed';

  if (!ble_code) {
    return res.status(400).json({
      encrypted_response: encrypt(JSON.stringify({
        granted: false,
        message: 'Invalid request: missing ble_code'
      }))
    });
  }

  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .eq('bluetooth_code', ble_code)
    .single();

  if (error || !employee) {
    console.log(`❌ Employee not found for ${direction}:`, ble_code);
    return res.json({
      encrypted_response: encrypt(JSON.stringify({
        granted: false,
        message: 'Employee not found'
      }))
    });
  }

  const now = new Date();
  const accessDirection = direction === 'exit' ? 'exit' : 'entry';

  const { error: logError } = await supabase
    .from('access_logs')
    .insert([{
      employee_id: employee.id,
      bluetooth_code: ble_code,
      direction: accessDirection,
      is_visitor: false,
      timestamp: now,
      authorized: true,
      needs_approval: false,
      validated_by: validatedById
    }]);

  if (logError) {
    console.error(`❌ Failed to insert ${direction} log:`, logError);
    return res.status(500).json({
      encrypted_response: encrypt(JSON.stringify({
        granted: false,
        message: 'Database error'
      }))
    });
  }

  // ✅ Trigger gate and update scanned employee
  temporaryFreeAccess = true;
  latestScannedEmployee = {
    name: employee.name,
    photo_url: employee.photo_url,
    badge_number: employee.badge_number, // ✅ You must ensure this field exists
    timestamp: now.toISOString()
  };

  console.log(`🚀 temporaryFreeAccess set to TRUE for ESP32 on ${direction}`);
  console.log(`✅ ${direction.toUpperCase()} granted for: ${employee.name}`);

  return res.json({
    encrypted_response: encrypt(JSON.stringify({
      granted: true,
      message: 'granted',
      user: employee.name,
      employee_name: employee.name
    }))
  });
});



// ✅ ESP32 access polling endpoint
app.get('/api/free-access', (req, res) => {
  if (temporaryFreeAccess) {
    temporaryFreeAccess = false; // Consume flag
    console.log('✅ ESP32 requested free access → granted');
    return res.json({ access: true });
  } else {
    return res.json({ access: false });
  }
});

// ✅ New route: Provide last scanned employee
app.get('/api/last-scan', (req, res) => {
  if (latestScannedEmployee) {
    const response = { found: true, employee: latestScannedEmployee };
    latestScannedEmployee = null; // Reset after sending
    return res.json(response);
  } else {
    return res.json({ found: false });
  }
});


// ✅ Existing access-event logic
app.post('/access-event', async (req, res) => {
  const { bluetooth_code, direction, is_visitor, validated_by } = req.body;

  const { data: employee, error: lookupError } = await supabase
    .from('employees')
    .select('*')
    .eq('bluetooth_code', bluetooth_code)
    .single();

  if (lookupError || !employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  if (!employee.access_enabled) {
    return res.status(403).json({ error: 'Access disabled for this employee' });
  }

  const [start, end] = employee.allowed_schedule.split('-');
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  const needsApproval = currentTime < start || currentTime > end;

  const { error: insertError } = await supabase.from('access_logs').insert([{
    employee_id: employee.id,
    bluetooth_code,
    direction,
    is_visitor,
    validated_by,
    timestamp: now,
    authorized: needsApproval ? null : true,
    needs_approval: needsApproval
  }]);

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  res.json({
    success: true,
    name: employee.name,
    photo_url: employee.photo_url,
    car_plate: employee.car_plate,
    direction,
    needsApproval,
    employee_id: employee.id
  });
});

// ✅ Gatekeeper approval route
app.patch('/approve-access/:id', async (req, res) => {
  const { id } = req.params;
  const { approved } = req.body;

  const { error } = await supabase
    .from('access_logs')
    .update({
      authorized: approved,
      needs_approval: false,
      approved: approved
    })
    .eq('id', id);

  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.json({ success: true });
});

// ✅ Optional test
app.post('/test-bluetooth-access', async (req, res) => {
  const { bluetooth_code } = req.body;

  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('*')
    .eq('bluetooth_code', bluetooth_code)
    .single();

  if (employeeError || !employee) {
    return res.status(404).json({ success: false, error: 'Employee not found' });
  }

  const [start, end] = employee.allowed_schedule.split('-');
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  const needsApproval = currentTime < start || currentTime > end;

  const { data: logEntry, error: logError } = await supabase
    .from('access_logs')
    .insert([{
      employee_id: employee.id,
      bluetooth_code,
      direction: 'in',
      timestamp: now.toISOString(),
      authorized: needsApproval ? null : true,
      needs_approval: needsApproval,
      is_visitor: false
    }])
    .select()
    .single();

  if (logError) {
    return res.status(500).json({ success: false, error: logError.message });
  }

  return res.json({
    success: true,
    needsApproval,
    employeeDetails: {
      name: employee.name,
      allowed_schedule: employee.allowed_schedule,
      current_time: currentTime
    },
    logId: logEntry.id
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ✅ Admin: Get all access logs
app.get('/admin/access-logs', async (req, res) => {
  const { data, error } = await supabase
    .from('access_logs')
    .select(`
      id,
      timestamp,
      direction,
      bluetooth_code,
      is_visitor,
      employee_id,
      authorized,
      needs_approval,
      employees (
        name,
        photo_url,
        allowed_schedule
      )
    `)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('❌ Failed to fetch access logs:', error);
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.json({ success: true, logs: data });
});

// ✅ Admin: Get all employees
app.get('/admin/employees', async (req, res) => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('❌ Failed to fetch employees:', error);
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.json({ success: true, employees: data });
});

// ✅ Manual gate trigger from frontend
app.post('/api/manual-open', (req, res) => {
  temporaryFreeAccess = true;
  console.log('🚨 Manual gate open requested by frontend');
  return res.json({ success: true, message: 'Gate open triggered manually' });
});

// Update the register-user endpoint to also insert into employees table

// ✅ Register new user
app.post('/admin/register-user', async (req, res) => {
  const userData = req.body;
  
  // Validate required fields for both users and employees
  const requiredFields = [
    'name', 
    'email', 
    'password', 
    'role', 
    'badge_number', 
    'bluetooth_code', 
    'allowed_schedule',
    'division' // Added division as a required field
  ];
  const missingFields = requiredFields.filter(field => !userData[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({ 
      success: false, 
      error: `Missing required fields: ${missingFields.join(', ')}` 
    });
  }
  
  try {
    // First create the auth user (for all users)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        name: userData.name,
        role: userData.role
      }
    });
    
    if (authError) {
      console.error('❌ Failed to create auth user:', authError);
      return res.status(500).json({ success: false, error: authError.message });
    }
    
    // Use the auth user ID for the users table
    const userRecord = {
      id: authUser.user.id,  // Use the UUID from Supabase Auth
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role
    };
    
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert([userRecord])
      .select();
    
    if (userError) {
      console.error('❌ Failed to create user record:', userError);
      
      // Try to clean up the auth user if the users table insert fails
      await supabase.auth.admin.deleteUser(authUser.user.id);
      
      return res.status(500).json({ success: false, error: userError.message });
    }
    
    // Now add to employees table as well
    const employeeRecord = {
      id: authUser.user.id, // Same ID across all tables
      name: userData.name,
      badge_number: userData.badge_number,
      bluetooth_code: userData.bluetooth_code,
      allowed_schedule: userData.allowed_schedule,
      photo_url: userData.photo_url || null,
      access_enabled: userData.access_enabled || true,
      division_id: userData.division // Fixed spelling from "divison_id" to "division_id"
    };
    
    const { error: employeeError } = await supabase
      .from('employees')
      .insert([employeeRecord]);
    
    if (employeeError) {
      console.error('❌ Failed to create employee record:', employeeError);
      
      // Try to clean up if employees table insert fails
      // Delete from users table
      await supabase.from('users').delete().eq('id', authUser.user.id);
      // Delete auth user
      await supabase.auth.admin.deleteUser(authUser.user.id);
      
      return res.status(500).json({ success: false, error: employeeError.message });
    }
    
    console.log('✅ User & Employee records created for:', userData.name, 'with ID:', authUser.user.id);
    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Error in user registration:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

