const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ Supabase with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ✅ TEMPORARY FLAG used by ESP32 to open gate
let temporaryFreeAccess = false;

// Health check
app.get('/', (req, res) => {
  res.send('API is running');
});

// ✅ Bluetooth access from mobile
app.post('/verify-access-from-mobile', async (req, res) => {
  console.log('📨 Received request on /verify-access-from-mobile');
  console.log('📡 Request body:', req.body);

  const { ble_code, direction } = req.body;
  const validatedById = 'c302e64d-601c-4cc2-895d-09648c83bbed';

  if (!ble_code) {
    return res.status(400).json({
      granted: false,
      message: 'Invalid request: missing ble_code'
    });
  }

  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .eq('bluetooth_code', ble_code)
    .single();

  if (error || !employee) {
    console.log('❌ Employee not found for code:', ble_code);
    return res.json({
      granted: false,
      message: 'denied'
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
    console.error('❌ Failed to insert log:', logError);
    return res.status(500).json({
      granted: false,
      message: 'internal_error'
    });
  }

  // ✅ ESP32 Trigger for BOTH entry and exit
  temporaryFreeAccess = true;
  console.log(`🚀 temporaryFreeAccess set to TRUE for ESP32 on ${accessDirection}`);

  console.log(`✅ ${accessDirection.toUpperCase()} granted for: ${employee.name}`);

  return res.json({
    granted: true,
    message: 'granted',
    employee_name: employee.name
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
