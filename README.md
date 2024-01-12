# Running the YouTube Channels Crawler Script
### Step 1: Install Dependencies

Open a terminal in the directory containing your script (index.js) and run the following command to install the necessary dependencies using npm:

`npm install`.

This will install Puppeteer and other required packages.

`nvm use v20`.


### Step 2: Configure Your Script

Open the index.js file in a text editor. Make sure to check and configure any variables or parameters inside the script, such as login credentials or file paths.

### Step 3: Run the Script

After configuring the script, return to your terminal and run the script using the following command:

`node index.js`

This will execute the script, and you should see the browser automation process happening. If there are any issues, carefully read the console output for error messages.

### Step 4: Check the Output

Upon completion, the script will save the YouTube channels data to a CSV file named channels_data.csv in the same directory as your script. You can open this file to view the results.

Additional Notes:

    Ensure that you have a stable internet connection during script execution.
    If you want to run the script in a hidden way you need to change `headless: false` at launch on main to `headless: 'new'`.
    Keep the terminal open until the script completes its execution.
