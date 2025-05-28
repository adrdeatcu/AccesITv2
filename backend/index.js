const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Express setup
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.send('API is running');
});

// Access event route (clean version)
app.post('/access-event', async (req, res) => {
  const { bluetooth_code, direction, is_visitor, validated_by } = req.body;

  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .eq('bluetooth_code', bluetooth_code)
    .single();

  if (error || !employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  if (!employee.access_enabled) {
    return res.status(403).json({ error: 'Access disabled' });
  }

  const { error: insertError } = await supabase.from('access_logs').insert([{
    user_id: 9999,
    bluetooth_code,
    direction,
    is_visitor,
    validated_by,
    timestamp: new Date()
  }]);

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  res.json({
    success: true,
    name: employee.name,
    photo_url: employee.photo_url,
    car_plate: employee.car_plate,
    direction
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
