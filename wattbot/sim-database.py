import sqlite3

# Connect to a database (it will create the database if it doesn't exist)
conn = sqlite3.connect(':memory:')  # In-memory database for testing
cursor = conn.cursor()

# Create a table
cursor.execute('''CREATE TABLE energy_usage (
                    id INTEGER PRIMARY KEY,
                    date TEXT,
                    consumption INTEGER
                    )''')

# Insert some test data
cursor.execute(
    "INSERT INTO energy_usage (date, consumption) VALUES ('2025-04-01', 350)")
cursor.execute(
    "INSERT INTO energy_usage (date, consumption) VALUES ('2025-04-02', 400)")
cursor.execute(
    "INSERT INTO energy_usage (date, consumption) VALUES ('2025-04-03', 320)")

# Commit changes
conn.commit()

# Query the data
cursor.execute("SELECT * FROM energy_usage")
rows = cursor.fetchall()

for row in rows:
    print(row)

# Close connection
conn.close()
