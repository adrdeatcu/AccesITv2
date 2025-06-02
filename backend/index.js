const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('API is running');
});

// Access event route
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

  // ✅ Always insert, regardless of schedule
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


// Gatekeeper approval route (optional test)
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
