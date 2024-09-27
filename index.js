const express = require('express');
const { Pool } = require('pg');
const dotenv= require('dotenv');
dotenv.config();
const app = express();
app.use(express.json()); // Parse JSON bodies

// Set up the PostgreSQL pool with connection string
const pool = new Pool({
  connectionString: process.env.url,
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
    try {
      const { row, column, newValue } = req.query;
  
      // Convert row and column to numbers
      const updatedRow = Number(row);
      const updatedColumn = Number(column) - 1; // Adjust for zero-based index
  
      // Check if the row exists
      const existingRow = await pool.query(
        `SELECT * FROM sheets_data WHERE id = $1;`,
        [updatedRow]
      );
  
      // If the row does not exist, insert a new record
      if (existingRow.rowCount === 0) {
        await pool.query(
          `INSERT INTO sheets_data (id, row_data) VALUES ($1, $2);`,
          [updatedRow, JSON.stringify(Array(updatedColumn + 1).fill(''))] // Initialize row_data with empty values
        );
      } 
  
      // Perform the update query using parameterized values
      const updateResult = await pool.query(
        `UPDATE sheets_data
         SET row_data = jsonb_set(row_data::jsonb, '{${updatedColumn}}', $2::jsonb)
         WHERE id = $1;`,
        [updatedRow, JSON.stringify(newValue)] // Use JSON.stringify to ensure proper JSON format
      );
  
      // Check if the update was successful
      if (updateResult.rowCount === 0) {
        return res.status(404).send({ message: 'No rows updated. Check the provided row or column.' });
      }
  
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
