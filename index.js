const scrapedin = require('scrapedin');
const fs = require('fs');
const Papa = require('papaparse');

const cookie = fs.readFileSync('./cookie.txt');
const scrapedinOptions = {
	cookies: JSON.parse(cookie),
};

let inputDir = './input/';
let inputFileName = inputDir + 'input.csv';
let inputFile = fs.readFileSync(inputFileName, 'utf8');
let emailFormatFileName = inputDir + 'email_format.txt';
let devRolesFileName = inputDir + 'dev_jobs.txt';

let outputDir = './output/';
let outputFileName = outputDir + `output.txt`;

const papaOptions = {
	header: true,
	deimiter: ',',
	skipEmptyLines: true,
	worker: true,
	encoding: 'utf8',
};

const DEFAULT_VALUE = '******';

const setDefaultIfUndefined = (value) => {
	return typeof value === 'undefined' ? DEFAULT_VALUE : value;
};

const generateEmail = (currentRow, email, fetchedData) => {
	let formattedEmail;

	try {
		let name = setDefaultIfUndefined(fetchedData.profile.name);
		let currentEmployer = setDefaultIfUndefined(
			fetchedData.positions['0'].companyName
		);
		let currentRole = setDefaultIfUndefined(
			fetchedData.positions['0'].title
		);
		let currentRoleStartDate = new Date(
			fetchedData.positions['0'].date1.split(' – ')[0]
		);
		let currentRoleYear = setDefaultIfUndefined(
			currentRoleStartDate.getFullYear()
		);
		let currentRoleMonth = setDefaultIfUndefined(
			currentRoleStartDate.getMonth().toString().padStart(2, '0')
		);
		let latestDegree = setDefaultIfUndefined(
			fetchedData.educations['0'].degree
		);
		let latestSchool = setDefaultIfUndefined(
			fetchedData.educations['0'].title
		);
		let recommendedRoles = fs.readFileSync(devRolesFileName, 'utf8');
		let emailTemplate = fs.readFileSync(emailFormatFileName, 'utf8');

		formattedEmail = emailTemplate
			.replace('{currentRow}', currentRow)
			.replace('{email}', email)
			.replace('{name}', name)
			.replace('{currentEmployer}', currentEmployer)
			.replace('{currentRole}', currentRole)
			.replace('{currentRoleYear}', currentRoleYear)
			.replace('{currentRoleMonth}', currentRoleMonth)
			.replace('{latestDegree}', latestDegree)
			.replace('{latestSchool}', latestSchool)
			.replace('{recommendedRoles}', recommendedRoles);
	} catch (e) {
		console.log('Error in setting data', e);
	}

	return formattedEmail;
};

(async () => {
	let scraper = await scrapedin(scrapedinOptions);
	let csvData = Papa.parse(inputFile, papaOptions);
	let currentRow = 1;

	for (const person of csvData.data) {
		let isProcessed = person.processed.toLowerCase() == 'yes';
		let linkedinURL = person.linkedin;
		let email = person.email;
		if (!isProcessed) {
			console.log(`${currentRow}: Fetching data for ${linkedinURL}`);
			let fetchedProfile = await scraper(linkedinURL, (waitTimeMs = 500));
			let generatedEmail = generateEmail(
				currentRow,
				email,
				fetchedProfile
			);
			if (generateEmail) {
				fs.appendFileSync(outputFileName, generatedEmail);
				console.log(`Saved generated email for ${linkedinURL}`);
			} else {
				console.log(`No email generated for ${linkedinURL}`);
			}
			person.processed = 'yes';
			isProcessed = person.processed.toLowerCase() == 'yes';
		} else {
			console.log(`Already generated email for ${linkedinURL}`);
		}
		currentRow += 1;
	}

	fs.writeFileSync(inputFileName, Papa.unparse(csvData));
	process.exit(0);
})();
