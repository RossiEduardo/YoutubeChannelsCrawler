const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { executablePath } = require('puppeteer');

const pathToExtension = require('path').join(__dirname, 'CapSolver.Browser.Extension');
puppeteer.use(StealthPlugin());

const fs = require('fs');
const { Parser } = require('json2csv');

function get_yt_urls(file) {
	return new Promise((resolve, reject) => {
		const filePath = file;

		// Read the file
		fs.readFile(filePath, 'utf8', (err, data) => {
			if (err) {
				reject('Error reading the file:', err);
				return;
			}

			// Split the data by lines
			const lines = data.split('\n');
			resolve(lines);
		});
	});
}

function get_google_credentials(file) {
	return new Promise((resolve, reject) => {
		const filePath = file;

		// Read the file
		fs.readFile(filePath, 'utf8', (err, data) => {
			if (err) {
				reject('Error reading the file:', err);
				return;
			}

			// Split the data by lines
			const lines = data.split('\n');

			// Create an array to store email credentials
			const emailCredentials = [];

			// Parse each line and extract login and password
			lines.forEach(line => {
				const [login, password] = line.trim().split(',');

				// Check if both login and password are present
				if (login && password) {
					emailCredentials.push({ login, password });
				}
			});

			resolve(emailCredentials);
		});
	});
}

function create_csv(yt_channels_data) {
	//convert to csv
	const json2csvParser = new Parser();
	const csv = json2csvParser.parse(yt_channels_data);

	fs.writeFile('channels_data.csv', csv, err => {
		if (err) throw err;
		console.log('Youtube channels data saved on CSV');
	});
}

async function login_to_google(page, navigationPromise, google_credentials) {
	const email = google_credentials.login;
	console.log('login into ', email);
	const password = google_credentials.password;
	await page.goto('https://accounts.google.com/');
	console.log('login to google...');
	await navigationPromise;
	await page.waitForTimeout(2000);

	await page.waitForSelector('input[type="email"]');
	await page.click('input[type="email"]');

	await navigationPromise;

	//TODO : change to your email
	await page.type('input[type="email"]', email);

	await page.waitForSelector('#identifierNext');
	await page.click('#identifierNext');

	await page.waitForTimeout(2000);

	await page.waitForSelector('input[type="password"]');
	await page.click('input[type="password"]');
	await page.waitForTimeout(2000);

	//TODO : change to your password
	await page.type('input[type="password"]', password);

	await page.waitForSelector('#passwordNext');
	await page.click('#passwordNext');

	// Wait the login
	await navigationPromise;
	await page.waitForTimeout(4000);

	// verify login
	const current_url = await page.url();
	if (current_url.includes('myaccount.google.com')) {
		console.log('logged in successfully');
		return "success";
	} else {
		console.log('Login failed');
		return "failed";
	}
}

async function get_channel_name(page) {
	// Extract the channel name
	const channel_name = await page.evaluate(() => {
		const element = document.querySelector('.ytd-channel-name yt-formatted-string');
		return element ? element.textContent.trim() : null;
	});
	console.log('\n========================\n');
	console.log('Channel Name:', channel_name);
	return channel_name;
}

async function categorize_social_medias(links) {
	const social_medias = {
		others: []
	};

	links.forEach(link => {
		if (link.includes('facebook.com')) {
			social_medias.facebook = link;
		} else if (link.includes('instagram.com')) {
			social_medias.instagram = link;
		} else if (link.includes('twitter.com')) {
			social_medias.twitter = link;
		} else {
			social_medias['others'].push(link);
		}
	});

	return social_medias;
}

async function get_channel_social_medias(page) {
	await page.click('.yt-simple-endpoint.style-scope.ytd-channel-tagline-renderer');
	// Wait for some time to ensure the content has changed after the click
	await page.waitForTimeout(2000);

	const social_media_links = await page.$$eval('.yt-channel-external-link-view-model-wiz__container a', links => {
		return links.map(link => link.textContent);
	});

	console.log(social_media_links);
	return social_media_links;
}

async function get_channel_email(page) {
	// Click on the button to see the users email
	try {
		await page.waitForSelector('#view-email-button-container');
		await page.click('#view-email-button-container');
		// Wait for the reCAPTCHA iframe to appear
		const iframeSelector = 'iframe[src^="https://www.google.com/recaptcha/"]';
		await page.waitForSelector(iframeSelector);
		const frame = await page.$(iframeSelector);
		const frameContent = await frame.contentFrame();

		// Switch to the reCAPTCHA iframe
		await page.waitForTimeout(1000); // Adding a short delay for stability
		const checkboxSelector = '.recaptcha-checkbox-checkmark';
		await frameContent.waitForSelector(checkboxSelector, { visible: true });
		const checkbox = await frameContent.$(checkboxSelector);
		await checkbox.click();
		console.log('Resolving captcha...');
		//wait the captcha be resolved
		await frameContent.waitForSelector('.recaptcha-checkbox-checked');
		//click on the submit button
		await page.waitForSelector('#submit-btn');
		await page.click('#submit-btn');
		//wait the email loads
		await page.waitForTimeout(2000);
		//get the email
		await page.waitForSelector('#email');
		const email = await page.$eval('#email', element => element.textContent);
		if (email === ' ') {
			console.log('Email address hidden. You have reached your access limit for today. Try switching accounts');
			return 'error';
		}
		console.log('e-mail:', email);
		return email;
	} catch (error) {
		console.error("This channel doesn't have e-mail");
		return ' ';
	}
}

async function scrap_channel_data(channel_url, page) {
	let yt_channel = {};
	let social_medias = {};
	yt_channel.url = channel_url;
	await page.goto(channel_url);
	await page.waitForTimeout(1000);

	yt_channel.name = await get_channel_name(page);

	social_medias = await get_channel_social_medias(page);
	social_medias = await categorize_social_medias(social_medias);
	yt_channel.facebook = social_medias['facebook'];
	yt_channel.instagram = social_medias['instagram'];
	yt_channel.twitter = social_medias['twitter'];
	yt_channel.others = social_medias['others'];

	yt_channel.email = await get_channel_email(page);

	await page.waitForTimeout(1000); // Adjust the time as needed

	return yt_channel;
}

async function create_connection() {
	let browser = await puppeteer.launch({
		headless: false,
		args: [`--disable-extensions-except=${pathToExtension}`, `--load-extension=${pathToExtension}`],
		executablePath: executablePath()
	});
	console.log('Connected!');
	let page = await browser.newPage();
	await page.setUserAgent(
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
	);

	return {
		browser: browser,
		page: page
	};
}

async function main() {
	console.log('Connecting to Scraping Browser...');
	let browser;
	let page;
	try {
		let connection = await create_connection();
		browser = connection.browser;
		page = connection.page;
		const navigationPromise = page.waitForNavigation();

		let yt_channels_data = [];
		const google_accounts = await get_google_credentials('emails.txt');
		let google_accounts_available = google_accounts.length;

		let login = await login_to_google(page, navigationPromise, google_accounts[google_accounts_available - 1]);
		google_accounts_available--;

		await navigationPromise;

		const yt_url_channels = await get_yt_urls('yt_channels.txt');
		await page.waitForTimeout(2000);

		for (let i = 0; i < yt_url_channels.length; i++) {
			try {
				let yt_channel;
				if(login === "success"){
					//go to youtube channel and get its infos
					yt_channel = await scrap_channel_data(yt_url_channels[i], page);
					yt_channels_data.push(yt_channel);
				}
				if (login === "failed" || yt_channel.email === 'error') {
					console.log('log out...');
					await page.goto('https://www.youtube.com/logout');
					await navigationPromise;
					await page.close();
					await browser.close();

					// Try to get the email to this channel again, but now with another google account
					if (google_accounts_available) {
						// create a new browser
						connection = await create_connection();
						browser = connection.browser;
						page = connection.page;

						login = await login_to_google(page, navigationPromise, google_accounts[google_accounts_available - 1]);
						await navigationPromise;
						google_accounts_available--;
						i--; // Going back to the channel we were on
						await page.waitForTimeout(2000);
					} else {
						console.log('No more google accounts available.\nExiting...');
						break;
					}
				}
			} catch (error) {
				console.error(`Error scraping channel ${i + 1}:`, error.message);
			}
		}
		create_csv(yt_channels_data);
	} finally {
		if (!page.isClosed()) {
			page.close();
		}
		if (browser.isConnected()) {
			browser.close();
		}
	}
}

main().catch(err => {
	console.error(err.stack || err);
	process.exit(1);
});

