const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json()); // Parse JSON bodies

// Set up the PostgreSQL pool with connection string
const pool = new Pool({
  connectionString: 'postgresql://stackithq_vit_pardhusnc2004_db_user:eB9UqYsoOyJH9B9jHl2EEc5JP93UoGYc@dpg-crqq3eu8ii6s73bhlea0-a.oregon-postgres.render.com/stackithq_vit_pardhusnc2004_db',
  ssl: {
    rejectUnauthorized: false // Necessary for some cloud PostgreSQL services
  }
});

// GET route to fetch data from PostgreSQL
app.get('/data', async (req, res) => {
  try {
    const result = await pool.query("SELECT * from sheets_data; "); // Replace with your query
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching data');
  }
});

// POST route to update PostgreSQL
app.post('/update', async (req, res) => {
    try{
    const { row, column, newValue } = req.query;

    // Convert row and column to numbers
    const updatedRow = Number(row);
    const updatedColumn = Number(column) - 1; // Adjust for zero-based index

    // Perform the update query using parameterized values
    await pool.query(
      `UPDATE sheets_data
       SET row_data = jsonb_set(row_data::jsonb, '{${updatedColumn}}', $2::jsonb)
       WHERE id = $1;`,
      [updatedRow, JSON.stringify(newValue)] // Use JSON.stringify to ensure proper JSON format
    );

    // Respond with success
    res.status(200).send({ message: 'Update successful' });
  } catch (error) {
    console.error('Error updating data:', error);
    res.status(500).send({ message: 'Error updating data', error: error.message });
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
