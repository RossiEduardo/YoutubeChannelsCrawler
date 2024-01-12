# Extracting Social Media and Email Information from YouTube Channels

This script takes a list of YouTube channel URLs from a TXT file and searches for social media information and contact email within each channel's "more" information using Puppeteer for browser scraping.

The script outputs a CSV file containing the following information for each URL:

    Extracted channel name
    Email (if found)
    Links to social media profiles (if found)

Prerequisites:

    Ensure you are logged in to a Google account for email access.
        - input that on index.js at login_to_google function;
    You need a CapSolver API key to handle captchas.
        - input your API key at /CapSolver.Browser.Extension/assets/config.js
    Only Node versions above v16.3.0 are supported.

Sample Process:

    The script initiates by opening a new tab to log in to your Google account.
    It then navigates to YouTube to gather data, following these steps:
        Extract the channel name
        Retrieve social media links
        Resolve captchas
        Obtain the email (if available)

Note:
To access email information, you must be logged in to a Google account and solve captchas. The script utilizes CapSolver to handle captchas, so ensure you provide your Google account credentials and CapSolver API key.

Sample YouTube Channel:

    URL: [Sample YouTube Channel URL]
    Channel Name: [Extracted Channel Name]
    Email: [Extracted Email (if available)]
    Social Media Links: [List of Social Media Links (if available)]
    

# Running the YouTube Channels Crawler Script
### Step 1: Install Dependencies

Open a terminal in the directory containing your script (index.js) and run the following command to install the necessary dependencies using npm:

`npm install`.

This will install Puppeteer and other required packages.

### Step 2: Configure Your Script

Open the index.js file in a text editor. Make sure to check and configure any variables or parameters inside the script, such as login credentials or file paths.

Important: Translate the 'View email address' to your language at index.js (line 95).

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

That's it! You have successfully run the YouTube Channels Crawler script. If you encounter any issues or have further questions, feel free to ask.
