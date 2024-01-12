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

function create_csv(yt_channels_data) {
	//convert to csv
	const json2csvParser = new Parser();
	const csv = json2csvParser.parse(yt_channels_data);

	fs.writeFile('channels_data.csv', csv, err => {
		if (err) throw err;
		console.log('Youtube channels data saved on CSV');
	});
}

async function login_to_google(page, navigationPromise) {
	await page.goto('https://accounts.google.com/');
    console.log("login to google...")
	await navigationPromise;
	await page.waitForTimeout(1000);

	await page.waitForSelector('input[type="email"]');
	await page.click('input[type="email"]');

	await navigationPromise;

	//TODO : change to your email
	await page.type('input[type="email"]', 'youremail@email.com');

	await page.waitForSelector('#identifierNext');
	await page.click('#identifierNext');

	await page.waitForTimeout(2000);

	await page.waitForSelector('input[type="password"]');
	await page.click('input[type="password"]');
	await page.waitForTimeout(1500);

	//TODO : change to your password
	await page.type('input[type="password"]', 'YOUR PASSWORD');

	await page.waitForSelector('#passwordNext');
	await page.click('#passwordNext');
    console.log("logged in to google account");
}

async function get_channel_name(page) {
	// Extract the channel name
	const channel_name = await page.evaluate(() => {
		const element = document.querySelector('.ytd-channel-name yt-formatted-string');
		return element ? element.textContent.trim() : null;
	});
	console.log('Channel Name:', channel_name);
	return channel_name;
}

async function categorize_social_medias(links) {
    const social_medias = {
        'others': []
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
	const buttonXPath = `//button[contains(., 'Ver endereço de e-mail')]`; //change to the right language
	await page.waitForXPath(buttonXPath);
	const [button] = await page.$x(buttonXPath);
	if (button) {
		await button.click();
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
		console.log("Resolving captcha...");
		//wait the captcha be resolved
		await page.waitForTimeout(15000);
		//click on the submit button
		await page.waitForSelector('#submit-btn');
		await page.click('#submit-btn');
		//wait the email loads
		await page.waitForTimeout(2000);
		//get the email
		await page.waitForSelector('#email');
		const email = await page.$eval('#email', element => element.textContent);
		console.log('e-mail:', email);
		return email;
	} else {
		console.error('Button not found');
		return '';
	}
}

async function scrap_channel_data(channel_url, page) {
	let yt_channel = {};
	let social_medias = {}
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

async function main() {
    console.log('Connecting to Scraping Browser...');
    const browser = await puppeteer.launch({
        headless: false,
        args: [`--disable-extensions-except=${pathToExtension}`, `--load-extension=${pathToExtension}`],
        executablePath: executablePath(),
    });
    console.log('Connected!');
    const page = await browser.newPage();
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    );
    const navigationPromise = page.waitForNavigation();
    try {
        let yt_channels_data = [];
        await login_to_google(page, navigationPromise);
        await navigationPromise;

        const yt_url_channels = await get_yt_urls('yt_channels.txt');

        await page.waitForTimeout(2000);

        for (let i = 0; i < yt_url_channels.length; i++) {
            try {
                const yt_channel = await scrap_channel_data(yt_url_channels[i], page);
                yt_channels_data.push(yt_channel);
            } catch (error) {
                console.error(`Error scraping channel ${i + 1}:`, error.message);
            }
        }
        create_csv(yt_channels_data);
    } finally {
        await page.close();
        await browser.close();
    }
}

main().catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
});
