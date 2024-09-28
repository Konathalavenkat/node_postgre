const express = require('express');
const { Pool } = require('pg');
const dotenv= require('dotenv');
dotenv.config();
const cors= require('cors');
const app = express();
app.use(express.json()); // Parse JSON bodies

app.use(cors());
// Set up the PostgreSQL pool with connection string
const pool = new Pool({
  connectionString: process.env.url,
  ssl: {
    rejectUnauthorized: false // Necessary for some cloud PostgreSQL services
  }
});

// CREATE TABLE users (
//     id SERIAL PRIMARY KEY,
//     username VARCHAR(255),
//     email VARCHAR(255),
//     password VARCHAR(255),
//     address TEXT
// );


app.get('/fetch_users',async (req,res)=>{
    try {
      const result = await pool.query("SELECT * from users; "); // Replace with your query
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching data');
    }
})

app.post('/add_user',async (req,res)=>{
    const {id,username,email,password,address} = req.body;
    try{
        await pool.query("INSERT INTO users (id,username,email,password,address) VALUES ($1,$2,$3,$4,$5)",[id,username,email,password,address]);
        res.status(201).send('User added successfully');
    }
    catch(err){
        console.error(err);
        res.status(500).send('Error adding user');
    }
})

app.put('/update-user', async (req, res) => {
    try{
        const {id,columnname,newValue} = req.query;
        const existinguser = await pool.query('SELECT * FROM users WHERE id = ' + Number(id));
        if(existinguser.rowCount === 0){
            await pool.query("INSERT INTO users (id,username,email,password,address) VALUES ($1,$2,$3,$4,$5)",[Number(id),null,null,null,null]);
        }
        await pool.query("UPDATE users SET " + columnname + " = $1 WHERE id = $2", [newValue, Number(id)]);
        res.status(200).send('User updated successfully');
    }
    catch(err){
        console.error(err);
        res.status(500).send('Error updating user');
    }
})



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
  
      const currentTime = new Date().toISOString();
        const updateLastModified = await pool.query(
            `UPDATE sheets_data
             SET last_modified = $2
             WHERE id = $1;`,
            [-1, currentTime] // Set current time in the last_modified field for id = -1
        );

        const existingRowResult = await pool.query(
          `SELECT row_data FROM sheets_data WHERE id = $1;`,
          [updatedRow]
      );

      let rowData = [];
      if (existingRowResult.rowCount > 0) {
          rowData = JSON.parse(existingRowResult.rows[0].row_data); // Parse the JSON data
      }

      // If the column index is greater than the current length, fill the array with empty strings
      if (updatedColumn >= rowData.length) {
          rowData = [...rowData, ...Array(updatedColumn - rowData.length + 1).fill('')]; // Fill up to the index
      }

      // Update the specific index with the new value
      rowData[updatedColumn] = newValue;

      // Perform the update query
      const updateResult = await pool.query(
          `UPDATE sheets_data
           SET row_data = $2::jsonb
           WHERE id = $1;`,
          [updatedRow, JSON.stringify(rowData)] // Use JSON.stringify to ensure proper JSON format
      );

      const updatetime= await pool.query(
        `UPDATE sheets_data
         SET last_modified = $2
         WHERE id = $1;`,
        [updatedRow, currentTime]
      )
  
      // Check if the update was successful
      if (updateResult.rowCount === 0 || updatetime.rowCount === 0) {
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
