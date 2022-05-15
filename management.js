"use strict";
//Entringo management tool by Harry Vipper.

//Used packages native to Node.js or from npm:
const fs = require('fs');
const inquirer = require('inquirer');
const randomstring = require('randomstring');
const shell = require('shelljs');

//Tool configuration.
const config = {
    baseDirectory: __dirname,
    SSHkey: 'entringo-update.key',
    DEBUG: false
};

//New system creation functions and objects.
var newSystem = {
    //Functions and objects for user input.
    input: { 
        //Object to store configuration from user input.
        configuration: {},
        //Array of languages supported.
        availableLanguages : ['en-us','ee-et','lv-lv','lt-lt'],
        //Function for country selection or creation.
        country: async function() {

            return inquirer.prompt([
                {
                    type: 'list',
                    prefix: '',
                    name: 'country',
                    message: 'Select country the system will be located in, or add a new country to the list:',
                    choices: [fs.readdirSync(config.baseDirectory + '/countries'),new inquirer.Separator(),'Insert new country'].flat()
                }])
            .then((answer) => {

                //New country creation.
                if(answer.country === 'Insert new country'){

                    return inquirer.prompt([
                        {
                            type: 'input',
                            prefix: '',
                            name: 'country',
                            message: 'Input the new country name:',
                            validate(value) {
                                if (value.match(/^[a-zA-Z]{1,255}$/g)) {return true;}
                                return 'Please enter a valid country name, you may only use letters.';
                            }
                        }])
                    .then((answer) => {

                        //Create new folder for the new country if it doesn't exist yet.
                        if (!fs.existsSync(config.baseDirectory + '/countries' + '/' + answer.country)){
                            fs.mkdirSync(config.baseDirectory + '/countries' + '/' + answer.country);
                        }

                        return this.configuration.country = answer.country;
                    });
                }
                else{
                    return this.configuration.country = answer.country;
                }
            });
        },
        //Function for owner selection or creation.
        owner: async function() {

            return inquirer.prompt([
                {
                    type: 'list',
                    prefix: '',
                    name: 'owner',
                    message: 'Select the owner of the system, or add a new owner to the list:',
                    choices: [fs.readdirSync(config.baseDirectory + '/countries' + '/' + this.configuration.country),new inquirer.Separator(),'Insert new owner'].flat()
                }])
            .then((answer) => {
                
                //New owner creation.
                if(answer.owner === 'Insert new owner'){

                    return inquirer.prompt([
                        {
                            type: 'input',
                            prefix: '',
                            name: 'owner',
                            message: 'Input the new owner:',
                            validate(value) {
                                if (value.match(/^[a-zA-Z0-9_\-\s]{1,255}$/g)) {return true;}
                                return 'Please enter a valid owner name, you may only use letters, numbers, \' \', \'-\' and \'_\'';
                            }
                        }])
                    .then((answer) => {

                        //Create new folder for the new owner if it doesn't exist yet.
                        if (!fs.existsSync(config.baseDirectory + '/countries' + '/' + this.configuration.country + '/' + answer.owner)){
                            fs.mkdirSync(config.baseDirectory + '/countries' + '/' + this.configuration.country + '/' + answer.owner);
                        }

                        return this.configuration.owner = answer.owner;
                    }); 
                }
                else{
                    return this.configuration.owner = answer.owner;
                }
            });
        },
        //Function for Back Office creation.
        backOfficeName: async function() {
        
            return inquirer.prompt([
                {
                    type: 'input',
                    prefix: '',
                    name: 'backOfficeName',
                    message: 'Input the new Back Office name:',
                    validate(value) {
                        if (value.match(/^[a-zA-Z0-9_\-\s]{1,32}$/g)) {return true;}
                        return 'Please enter a valid Back Office name, you may only use letters, numbers, \' \', \'-\' and \'_\'';
                    }
                }])
            .then((answer) => {

                //Existance verification.
                if (fs.existsSync(config.baseDirectory + '/countries' + '/' + this.configuration.country + '/'+ this.configuration.owner + '/' + answer.backOfficeName)){
                    console.log("A Back Office with that name already exists, please  input a different name or exit!");
                    return this.backOfficeName();
                }
                else{
                    this.configuration.sbo = {};
                    return this.configuration.sbo.name = answer.backOfficeName;
                }
            });          
        },
        //Function for timezone selection.
        timezone: async function() {
        
            return inquirer.prompt([
                {
                    type: 'input',
                    prefix: '',
                    name: 'timezone',
                    message: 'Input the timezone in which the new system will be located:',
                    validate(value) {
                        try {

                            //Timezone format verification.
                            Intl.DateTimeFormat(undefined, {timeZone: value});
                            return true;
                        }
                        catch (error) {
                            return 'Please enter a valid timezone, for example: "Europe/Tallinn"'
                        }
                    }
                }])
            .then((answer) => {
                return this.configuration.timezone = answer.timezone;
            });           
        },
        //Function for default language selection.
        defaultLang: async function() {
        
            return inquirer.prompt([
                {
                    type: 'input',
                    prefix: '',
                    name: 'defaultLang',
                    message: 'Input the default language for the new system:',
                    validate(value) {

                        //Language verification against a list of available languages.
                        if (newSystem.input.availableLanguages.includes(value)) {return true;}
                        return 'Please enter a valid language from the list: ' + newSystem.input.availableLanguages.join();
                    }
                }])
            .then((answer) => {
                return this.configuration.defaultLang = answer.defaultLang;
            });         
        },
        //Function for Area Server count input.
        areaServerCount: async function() {
        
            return inquirer.prompt([
                {
                    type: 'input',
                    prefix: '',
                    name: 'areaServerCount',
                    message: `Input the number of Area Servers which will be controlled by the new Back Office: ${this.configuration.sbo.name}:`,
                    validate(value) {
                        if (value.match(/^[1-9]{1,1}$/g)) {return true;}
                        return 'Please enter a valid number from 1 to 9';
                    }
                }])
            .then((answer) => {

                //Create the array for the Area Servers.
                return this.configuration.sbo.las = Array.apply(null, Array(parseInt(answer.areaServerCount)));
            });        
        },
        //Function for Area Server name input.
        areaServerName: async function(areaServerIndex) {
        
            return inquirer.prompt([
                {
                    type: 'input',
                    prefix: '',
                    name: 'areaServerName',
                    message: 'Input the Area Server name:',
                    validate(value) {
                        if (value.match(/^[a-zA-Z0-9_\-\s]{1,32}$/g)) {return true;}
                        return 'Please enter a valid Area Server name, you may only use letters, numbers, \' \', \'-\' and \'_\'';
                    }
                }])
            .then((answer) => {
                this.configuration.sbo.las[areaServerIndex] = {};
                return this.configuration.sbo.las[areaServerIndex].name = answer.areaServerName;
            });         
        },
        //Function for Access Gate count input.
        accessGateCount: async function(areaServerIndex) {
        
            return inquirer.prompt([
                {
                    type: 'input',
                    prefix: '',
                    name: 'accessGateCount',
                    message: `Input the number of Access Gates which will be controlled by the new Area Server: ${this.configuration.sbo.las[areaServerIndex].name}:`,
                    validate(value) {
                        if (value.match(/^[1-9]{1,1}$/g)) {return true;}
                        return 'Please enter a valid number from 1 to 9';
                    }
                }])
            .then((answer) => {

                //Create the array for the Access Gates.
                return this.configuration.sbo.las[areaServerIndex].hal = Array.apply(null, Array(parseInt(answer.accessGateCount)));
            });
        },
        //Function for Access Gate name input.
        accessGateName: async function(areaServerIndex,accessGateIndex) {
        
            return inquirer.prompt([
                {
                    type: 'input',
                    prefix: '',
                    name: 'accessGateName',
                    message: 'Input the Access Gate name:',
                    validate(value) {
                        if (value.match(/^[a-zA-Z0-9_\-\s]{1,32}$/g)) {return true;}
                        return 'Please enter a valid Access Gate name, you may only use letters, numbers, \' \', \'-\' and \'_\'';
                    }
                }])
            .then((answer) => {
                this.configuration.sbo.las[areaServerIndex].hal[accessGateIndex] = {};
                return this.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].name = answer.accessGateName;
            });   
        },
        //Function for Access Gate direction input.
        accessGateDirection: async function(areaServerIndex,accessGateIndex) {
        
            return inquirer.prompt([
                {
                    type: 'list',
                    prefix: '',
                    name: 'accessGateDirection',
                    message: 'Choose the Access Gate direction:',
                    choices: ['Entry','Exit']
                }])
            .then((answer) => {
                return this.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].direction = answer.accessGateDirection;
            });          
        },
        //Function for Camera count input.
        cameraCount: async function(areaServerIndex,accessGateIndex) {
        
            return inquirer.prompt([
                {
                    type: 'input',
                    prefix: '',
                    name: 'cameraCount',
                    message: `Input the number of Cameras which will be controlled by the new Access Gate: ${this.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].name}:`,
                    validate(value) {
                        if (value.match(/^[1-2]{1,1}$/g)) {return true;}
                        return 'Please enter a valid number from 1 to 2';
                    }
                }])
            .then((answer) => {
                //Create the array for the Cameras.
                return this.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].cameras = Array.apply(null, Array(parseInt(answer.cameraCount)));
            }); 
        },
        //Function for Camera ID input.
        cameraID: async function(areaServerIndex,accessGateIndex,cameraIndex) {
        
            return inquirer.prompt([
                {
                    type: 'input',
                    prefix: '',
                    name: 'cameraID',
                    message: 'Input the Camera ID:',
                    validate(value) {
                        if (value.match(/^[a-zA-Z0-9_\-]{1,16}$/g)) {return true;}
                        return 'Please enter a valid Camera ID, you may only use letters, numbers, \'-\' and \'_\'';
                    }
                }])
            .then((answer) => {
                this.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].cameras[cameraIndex] = {};
                return this.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].cameras[cameraIndex].id = answer.cameraID;
            });     
        },
        //Function for IPv4 address input.
        ip: async function(message) {
        
            return inquirer.prompt([
                {
                    type: 'input',
                    prefix: '',
                    name: 'ip',
                    message: message,
                    validate(value) {
                        
                        //IPv4 address verification using regex from:
                        /*
                        Author: Danail Gabenski
                        Date: 29.01.2022
                        Availability: https://stackoverflow.com/questions/5284147/validating-ipv4-addresses-with-regexp
                        */
                        if (value.match(/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)(\.(?!$)|$)){4}$/g)) {return true;}
                        return 'Please enter a valid IPv4 address';
                    }
                }])
            .then((answer) => {
                return answer.ip;
            }); 
        }
    },
    //Functions for new system creation.
    create: {
        //Function to get all necessary parameters for new system generation from the user.
        fromInput: async function() {

            try{

                //Get input for country and owner.
                await newSystem.input.country();
                await newSystem.input.owner();

                //Get input for Back Office.
                await newSystem.input.backOfficeName();
                newSystem.input.configuration.sbo.ip = await newSystem.input.ip('Input the Back Office IP:');
                await newSystem.input.timezone();
                await newSystem.input.defaultLang ();

                //Get input for Area Servers.
                await newSystem.input.areaServerCount();
                let areaServerIndex = 0;
                
                for await(let temp of newSystem.input.configuration.sbo.las){

                    await newSystem.input.areaServerName(areaServerIndex);
                    newSystem.input.configuration.sbo.las[areaServerIndex].ip = await newSystem.input.ip('Input the Area Server IP:');

                    //Get input for Access Gates.
                    await newSystem.input.accessGateCount(areaServerIndex);
                    let accessGateIndex = 0;

                    for await(let temp of newSystem.input.configuration.sbo.las[areaServerIndex].hal){

                        await newSystem.input.accessGateName(areaServerIndex,accessGateIndex);
                        newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].ip = await newSystem.input.ip('Input the Access Gate IP:');
                        newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].controllerIP = await newSystem.input.ip('Input the Controller IP:');
                        await newSystem.input.accessGateDirection(areaServerIndex,accessGateIndex);

                        //Get input for Cameras.
                        await newSystem.input.cameraCount(areaServerIndex,accessGateIndex);
                        let cameraIndex = 0;

                        for await(let temp of newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].cameras){

                            await newSystem.input.cameraID(areaServerIndex,accessGateIndex,cameraIndex);
                            newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].cameras[cameraIndex].ip = await newSystem.input.ip('Input the Camera IP:');
                            cameraIndex++;
                        }
                        accessGateIndex++;
                    }
                    areaServerIndex++;
                }

                //Set the rest of the parameters to their defaults.
                newSystem.input.configuration.defaults =  true;
            }
            catch (errors){
                console.log('Error(s) occured while getting user input for new system configuration!');
                throw(errors);
            }
        },
        //Function for the creation of the directory structure for all system components.
        directoryStructure: function() {

            let commands =`
                #!/bin/bash
                mkdir ${config.baseDirectory}/countries/\'${newSystem.input.configuration.country}\'
                mkdir ${config.baseDirectory}/countries/\'${newSystem.input.configuration.country}\'/\'${newSystem.input.configuration.owner}\'
                mkdir ${config.baseDirectory}/countries/\'${newSystem.input.configuration.country}\'/\'${newSystem.input.configuration.owner}\'/\'${newSystem.input.configuration.sbo.name}\'        
                `;

            newSystem.input.configuration.sbo.las.forEach((areaServer,areaServerIndex) => {

                commands = commands.concat(`mkdir ${config.baseDirectory}/countries/\'${newSystem.input.configuration.country}\'/\'${newSystem.input.configuration.owner}\'/\'${newSystem.input.configuration.sbo.name}\'/\'${areaServer.name}\'
                    `);

                areaServer.hal.forEach((accessGate,accessGateIndex) => {
                    commands = commands.concat(`mkdir ${config.baseDirectory}/countries/\'${newSystem.input.configuration.country}\'/\'${newSystem.input.configuration.owner}\'/\'${newSystem.input.configuration.sbo.name}\'/\'${areaServer.name}\'/\'${accessGate.name}\'
                        `);         
                });
            });

            //Cut the indendation.
            commands = commands.replace(/(\n)\s+/g, '$1');

            terminal.runBash(commands)
        },
        //Function for the creation of the sytstem configuration based on input values.
        configuration: function() {

            if(newSystem.input.configuration.defaults === true){

                //Create Back Office configuration.
                newSystem.input.configuration.sbo.configuration = JSON.parse(JSON.stringify(newSystem.template.sboConfiguration));
                newSystem.input.configuration.sbo.configuration.DBPassword = randomstring.generate(32);
                newSystem.input.configuration.sbo.configuration.AuthKey= randomstring.generate(64).toUpperCase();
                newSystem.input.configuration.sbo.configuration.EncrKey = randomstring.generate(32).toUpperCase();
                newSystem.input.configuration.sbo.configuration.SystemName = newSystem.input.configuration.sbo.name;
                newSystem.input.configuration.sbo.configuration.LocalTimeZone = newSystem.input.configuration.timezone;
                newSystem.input.configuration.sbo.configuration.DefaultLang = newSystem.input.configuration.defaultLang;
                
                //Create system management configuration.
                newSystem.input.configuration.management = {};
                newSystem.input.configuration.management.deployed = false;
                newSystem.input.configuration.management.sbo = {};
                newSystem.input.configuration.management.sbo.name = newSystem.input.configuration.sbo.name;
                newSystem.input.configuration.management.sbo.ip = newSystem.input.configuration.sbo.ip;
                newSystem.input.configuration.management.sbo.port = 22;
                newSystem.input.configuration.management.sbo.las = [];
                
                newSystem.input.configuration.sbo.las.forEach((areaServer,areaServerIndex) => {
                    
                    //Create Area Server configuration.
                    newSystem.input.configuration.sbo.las[areaServerIndex].configuration = JSON.parse(JSON.stringify(newSystem.template.lasConfiguration));
                    newSystem.input.configuration.sbo.las[areaServerIndex].configuration.DBPassword = randomstring.generate(32);
                    newSystem.input.configuration.sbo.las[areaServerIndex].configuration.SBOAddress = newSystem.input.configuration.sbo.ip + "";
                    newSystem.input.configuration.sbo.las[areaServerIndex].configuration.LocalTimeZone = newSystem.input.configuration.timezone;
                    newSystem.input.configuration.sbo.las[areaServerIndex].configuration.DefaultLang = newSystem.input.configuration.defaultLang;

                    //Add to system management configuration.
                    newSystem.input.configuration.management.sbo.las[areaServerIndex] = {};
                    newSystem.input.configuration.management.sbo.las[areaServerIndex].name = newSystem.input.configuration.sbo.las[areaServerIndex].name;
                    newSystem.input.configuration.management.sbo.las[areaServerIndex].ip = newSystem.input.configuration.sbo.las[areaServerIndex].ip;
                    newSystem.input.configuration.management.sbo.las[areaServerIndex].port = 22;
                    newSystem.input.configuration.management.sbo.las[areaServerIndex].hal = [];
                    
                    areaServer.hal.forEach((accessGate,accessGateIndex) => {
                        
                        //Create Access Gate configuration.
                        newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].configuration = JSON.parse(JSON.stringify(newSystem.template.halConfiguration));
                        newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].configuration.IPAddress.LAS = newSystem.input.configuration.sbo.las[areaServerIndex].ip + "";
                        newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].configuration.IPAddress.Controller = newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].controllerIP + "";

                        //Set Access Gate direction.
                        if(newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].direction == "Entry"){
                            newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].configuration.Misc.EntryCamera = true;
                        }
                        else{
                            newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].configuration.Misc.EntryCamera = false;
                        }

                        //Add to system management configuration.
                        newSystem.input.configuration.management.sbo.las[areaServerIndex].hal[accessGateIndex] = {};
                        newSystem.input.configuration.management.sbo.las[areaServerIndex].hal[accessGateIndex].name = newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].name;
                        newSystem.input.configuration.management.sbo.las[areaServerIndex].hal[accessGateIndex].ip = newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].ip;
                        newSystem.input.configuration.management.sbo.las[areaServerIndex].hal[accessGateIndex].port = 22;

                        accessGate.cameras.forEach((camera,cameraIndex) => {
                        
                            //Set Camera configuration.
                            newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].configuration.Cameras[cameraIndex] = JSON.parse(JSON.stringify(newSystem.template.cameraConfiguration));
                            newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].configuration.Cameras[cameraIndex].ID = newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].cameras[cameraIndex].id;
                            newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].configuration.Cameras[cameraIndex].IP = newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].cameras[cameraIndex].ip;

                            if(cameraIndex === 0){
                                newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].configuration.Cameras[cameraIndex].IsMain = true;
                            }
                            else{
                                newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].configuration.Cameras[cameraIndex].IsMain = false;
                            }
                        });
                    });
                });
            }
            else{
                throw('Error(s) occured while creating initial system configuration: Non default configuration');
            }
        },
        //Function to write the configuration files to their apropriate locations.
        configurationFiles: function() {

            //Write the Back Office configuration to the config.json file in the correct directory.
            let commands =`#!/bin/bash\necho '` + JSON.stringify(newSystem.input.configuration.sbo.configuration,null,5) + `' > ${config.baseDirectory}/countries/\'${newSystem.input.configuration.country}\'/\'${newSystem.input.configuration.owner}\'/\'${newSystem.input.configuration.sbo.name}\'/config.json\n`;
            
            //Write the system access configuration to the management.json file in the correct directory.
            commands = commands.concat("echo '" + JSON.stringify(newSystem.input.configuration.management,null,5) + `' > ${config.baseDirectory}/countries/\'${newSystem.input.configuration.country}\'/\'${newSystem.input.configuration.owner}\'/\'${newSystem.input.configuration.sbo.name}\'/management.json\n`);
            
            newSystem.input.configuration.sbo.las.forEach((areaServer,areaServerIndex) => {
            
                //Write the Area server configuration to the config.json file in the correct directory.
                commands = commands.concat("echo '" + JSON.stringify(newSystem.input.configuration.sbo.las[areaServerIndex].configuration,null,5) + `' > ${config.baseDirectory}/countries/\'${newSystem.input.configuration.country}\'/\'${newSystem.input.configuration.owner}\'/\'${newSystem.input.configuration.sbo.name}\'/\'${newSystem.input.configuration.sbo.las[areaServerIndex].name}\'/config.json\n`);

                areaServer.hal.forEach((accessGate,accessGateIndex) => {
                    
                    //Write the Access Gate configuration to the config.json file in the correct directory.
                    commands = commands.concat("echo '" + JSON.stringify(newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].configuration,null,5) + `' > ${config.baseDirectory}/countries/\'${newSystem.input.configuration.country}\'/\'${newSystem.input.configuration.owner}\'/\'${newSystem.input.configuration.sbo.name}\'/\'${newSystem.input.configuration.sbo.las[areaServerIndex].name}\'/\'${newSystem.input.configuration.sbo.las[areaServerIndex].hal[accessGateIndex].name}\'/config.json\n`);
                });
            });

            terminal.runBash(commands)
        },
        //Function to generate x509 certificates required by the system.
        certificates: function (backOfficePath) {

            //Generate a password for the certificates.
            let password = newSystem.input.configuration.sbo.configuration.DBPassword = randomstring.generate(32);

            //Generate x509 certificates required by the system.
            let commands =`
                #!/bin/bash
                if [[ ! -d "${backOfficePath}/Entringo-Certificates" ]]; 
                then
                    mkdir ${backOfficePath}/Entringo-Certificates
                    chmod 700 ${backOfficePath}/Entringo-Certificates
                fi 
                cd ${backOfficePath}/Entringo-Certificates/
                openssl genrsa -passout pass:${password} -out EntringoCA.key 2048
                openssl req -x509 -new -nodes -key EntringoCA.key -passin pass:${password} -sha256 -days 1825 -out EntringoCA.crt -subj '/C=EE/ST=Tallinn/L=Tallinn/O=Hansab/OU=Entringo/CN=EntringoCA'
                openssl genrsa -passout pass:${password} -out HAL_Server.key 2048
                openssl req -new -passin pass:${password} -key HAL_Server.key -out HAL_Server.csr -subj '/C=EE/ST=Tallinn/L=Tallinn/O=Hansab/OU=Entringo/CN=Entringo'
                openssl x509 -req -passin pass:${password} -in HAL_Server.csr -CA EntringoCA.crt -CAkey EntringoCA.key -CAcreateserial -out HAL_Server.crt -days 1825 -sha256 -extensions 'authorityKeyIdentifier=keyid,issuer basicConstraints=CA:FALSE keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment'
                openssl genrsa -passout pass:${password} -out LAS_Client.key 2048
                openssl req -new -passin pass:${password} -key LAS_Client.key -out LAS_Client.csr -subj '/C=EE/ST=Tallinn/L=Tallinn/O=Hansab/OU=Entringo/CN=Entringo'
                openssl x509 -req -passin pass:${password} -in LAS_Client.csr -CA EntringoCA.crt -CAkey EntringoCA.key -CAcreateserial -out LAS_Client.crt -days 1825 -sha256 -extensions 'authorityKeyIdentifier=keyid,issuer basicConstraints=CA:FALSE keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment'
                openssl genrsa -passout pass:${password} -out LAS_Server.key 2048
                openssl req -new -passin pass:${password} -key LAS_Server.key -out LAS_Server.csr -subj '/C=EE/ST=Tallinn/L=Tallinn/O=Hansab/OU=Entringo/CN=Entringo'
                openssl x509 -req -passin pass:${password} -in LAS_Server.csr -CA EntringoCA.crt -CAkey EntringoCA.key -CAcreateserial -out LAS_Server.crt -days 1825 -sha256 -extensions 'authorityKeyIdentifier=keyid,issuer basicConstraints=CA:FALSE keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment'
                openssl genrsa -passout pass:${password} -out SBO_Client.key 2048
                openssl req -new -passin pass:${password} -key SBO_Client.key -out SBO_Client.csr -subj '/C=EE/ST=Tallinn/L=Tallinn/O=Hansab/OU=Entringo/CN=Entringo'
                openssl x509 -req -passin pass:${password} -in SBO_Client.csr -CA EntringoCA.crt -CAkey EntringoCA.key -CAcreateserial -out SBO_Client.crt -days 1825 -sha256 -extensions 'authorityKeyIdentifier=keyid,issuer basicConstraints=CA:FALSE keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment'
                openssl genrsa -passout pass:${password} -out Paystation.key 2048
                openssl req -new -passin pass:${password} -key Paystation.key -out Paystation.csr -subj '/C=EE/ST=Tallinn/L=Tallinn/O=Hansab/OU=Entringo/CN=Entringo'
                openssl x509 -req -passin pass:${password} -in Paystation.csr -CA EntringoCA.crt -CAkey EntringoCA.key -CAcreateserial -out Paystation.crt -days 1825 -sha256 -extensions 'authorityKeyIdentifier=keyid,issuer basicConstraints=CA:FALSE keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment'
                openssl pkcs12 -export -passout pass:${password} -in Paystation.crt -inkey Paystation.key -out Paystation.pfx
                echo ${password} > certificate_password.txt
                chmod 600 ${backOfficePath}/Entringo-Certificates/*
                `;
        
            //Cut the indendation.
            commands = commands.replace(/(\n)\s+/g, '$1');
        
            terminal.runBash(commands);
        },
        //Function to sequentially run all function for new system generation.
        new: async function(){

            try{
                await this.fromInput();
                this.configuration();
                this.directoryStructure();
                this.configurationFiles();
                this.certificates(`${config.baseDirectory}/countries/\'${newSystem.input.configuration.country}\'/\'${newSystem.input.configuration.owner}\'/\'${newSystem.input.configuration.sbo.name}\'`);
            
                console.log('System created!');

                return mainMenu;
            }
            catch(errors){
                console.log('Error(s) occured while creating new system!');
                throw(errors);
            }
        }
    },    
    //Templates for system configuration.
    template: {
        //Template for Back Office configuration.
        sboConfiguration:{
            "DBName": "sbo",
            "Username": "sbo",
            "DBPassword": "password",
            "DBAddress": "localhost",
            "LocalTimeZone": "Europe/Tallinn",
            "DefaultLang": "en-us",
            "AuthKey": "",
            "EncrKey": "",
            "LASPort": 0,
            "ELHost": "http://127.0.0.1",
            "PicPath": "/entringo/Entringo-Numbers/",
            "SBOServerCert": "/entringo/Entringo-Certificates/SBO_Server.crt",
            "SBOServerKey": "/entringo/Entringo-Certificates/SBO_Server.key",
            "LASClientCert": "/entringo/Entringo-Certificates/LAS_Client.crt",
            "LASClientKey": "/entringo/Entringo-Certificates/LAS_Client.key",
            "CACert": "/entringo/Entringo-Certificates/EntringoCA.crt",
            "ElSeIndex": "sbo",
            "SystemName": "Entringo backoffice",
            "WebListenPort": 0,
            "GRPCListenPort": 0,
            "Currency": "€",
            "ElChargersEnabled": false,
            "DaysToDelete": 0
        },
        //Template for Area Server configuration.
        lasConfiguration:{
            "DBName": "las",
            "Username": "las",
            "DBPassword": "password",
            "DBAddress": "localhost",
            "LocalTimeZone": "Europe/Tallinn",
            "DefaultLang": "en-us",
            "SBOAddress": "IP:",
            "HalPort": 0,
            "LASGRPCPort": 0,
            "WebPort": 0,
            "PicPath": "/entringo/Entringo-Numbers/",
            "SBOClientCert": "/entringo/Entringo-Certificates/SBO_Client.crt",
            "SBOClientKey": "/entringo/Entringo-Certificates/SBO_Client.key",
            "HALClientCert": "/entringo/Entringo-Certificates/LAS_Client.crt",
            "HALClientKey": "/entringo/Entringo-Certificates/LAS_Client.key",
            "LASServerCert": "/entringo/Entringo-Certificates/LAS_Server.crt",
            "LASServerKey": "/entringo/Entringo-Certificates/LAS_Server.key",
            "CACert": "/entringo/Entringo-Certificates/EntringoCA.crt",
            "PlateSimilarityOnExit": 0,
            "DaysToDelete": 0
        },
        //Template for Access Gate configuration.
        halConfiguration:{
            "Cameras": [],
            "CardReader": {
                "Address": "",
                "Enable": false
            },
            "Cert": {
                "CA": "/entringo/Entringo-Certificates/EntringoCA.crt",
                "HALServer": "/entringo/Entringo-Certificates/HAL_Server.crt",
                "LASClient": "/entringo/Entringo-Certificates/LAS_Client.crt",
                "Key": {
                    "HALServer": "/entringo/Entringo-Certificates/HAL_Server.key",
                    "LASClient": "/entringo/Entringo-Certificates/LAS_Client.key"
                }
            },
            "Display": {
                "DateFormat": "DD-MM-YYYY",
                "TimeFormat": "HH:mm:ss"
            },
            "IO": {
                "Input": {
                    "EntryLoop": 0,
                    "Error": 0,
                    "IsGateClosed": 0,
                    "IsGateOpen": 0,
                    "OpenGate": 0,
                    "SafetyLoop": 0
            },
                "Output": {
                    "GateClose": 0,
                    "GateOpen": 0
                }
            },
            "IPAddress": {
                "Controller": "IP",
                "LAS": "IP"
            },
            "Misc": {
                "DontRequireIntInPlate": false,
                "EntryCamera": false,
                "PassageProcessTimeoutSecs": 0,
                "PictureTakeAttempts": 0,
                "RetakePictureAfterNSeconds": 0,
                "ShowUnableToDetectMsgAfterNSeconds": 0,
                "SilentPictureRetake": 0,
                "StreamRestartTime": 0
            },
            "Port": {
                "Camera": 0,
                "CameraStream": 0,
                "ControllerEventListenerPort": 0,
                "GRPCListen": 0,
                "WebListen": 0
            }
        },
        //Template for Camera configuration.
        cameraConfiguration:{
            "ID": "ID",
            "IP": "IP",
            "IsMain": true,
            "Type": "ARH"
        }
    }
}

//System deployment functions.
var deploySystem = {
    //Function for SSH keys creation and deployment to the system.
    SSHKeys: function(backOfficeManagement) {

        //Deloy SSH key to the Back Office.
        let commands =`
            #!/bin/bash
            sshpass -f ./deployment_password ssh-copy-id -p ${backOfficeManagement.sbo.port} -i ~/.ssh/${config.SSHkey}.pub entringo@${backOfficeManagement.sbo.ip}
            ssh -i ~/.ssh/${config.SSHkey} -p ${backOfficeManagement.sbo.port} entringo@${backOfficeManagement.sbo.ip} /bin/bash <<SBO
            ssh-keygen -t ed25519 -f ~/.ssh/sbo.key -q -N ""
            `;
    
        //Create and deploy SSH keys to the Area Servers and Access Gates belonging to the Back Office.
        backOfficeManagement.sbo.las.forEach((areaServer,areaServerIndex) => {
    
            //Check if Area Server is local to the Back Office.
            if(backOfficeManagement.sbo.ip == areaServer.ip){
                commands = commands.concat(`
                ssh-keygen -t ed25519 -f ~/.ssh/las.key -q -N ""
                `);
    
                //Deploy SSH keys to Access Gates belonging to the Area Server.
                areaServer.hal.forEach((accessGate,accessGateIndex) => {
                    
                    //Check if Access Gate is local to the Back Office.
                    if(accessGate.ip == areaServer.ip){
                        //Do nothing.
                    }
                    else{

                        //Deploy SSH key to the Access Gate.
                        commands = commands.concat(`
                            sshpass -f ~/deployment_password ssh-copy-id -p ${accessGate.port} -i ~/.ssh/las.key.pub entringo@${accessGate.ip}
                            `);         
                    }
                });
            }
            else{

                //Deploy SSH key to the Area Server.
                commands = commands.concat(`
                    sshpass -f ~/deployment_password ssh-copy-id -p ${areaServer.port} -i ~/.ssh/sbo.key.pub entringo@${areaServer.ip}
                    ssh -i ~/.ssh/sbo.key -p ${areaServer.port} entringo@${areaServer.ip} /bin/bash <<LAS${areaServerIndex}
                    ssh-keygen -t ed25519 -f ~/.ssh/las.key -q -N ""
                    `);
    
                //Deploy SSH keys to Access Gates belonging to the Area Server.
                areaServer.hal.forEach((accessGate,accessGateIndex) => {
                    
                    //Check if Access Gate is local to the Area Server.
                    if(accessGate.ip == areaServer.ip){
                        //Do nothing.
                    }
                    else{

                        //Deploy SSH key to the Access Gate.
                        commands = commands.concat(`
                            sshpass -f ~/deployment_password ssh-copy-id -p ${accessGate.port} -i ~/.ssh/las.key.pub entringo@${accessGate.ip}
                            `);         
                    }
                });
                //Add delimiter.
                commands = commands.concat(`
                    LAS${areaServerIndex}`);
            }
        });
    
        //Add delimiter.
        commands = commands.concat(`
            SBO`);
    
        //Cut the indendation.
        commands = commands.replace(/(\n)\s+/g, '$1');
    
        terminal.runBash(commands);
    },
    //Function for changing the passwords of the system.
    changePasswords: function(newPasswords,backOfficePath,backOfficeManagement,) {

        //Safety check for undefined passwords.
        if(newPasswords.sbo === undefined | newPasswords.las === undefined | newPasswords.hal === undefined){
            throw 'Password undefined!'
        }
    
        //Change password of the Back Office.
        let commands =`
            #!/bin/bash
            ssh -i ~/.ssh/${config.SSHkey} -p ${backOfficeManagement.sbo.port} entringo@${backOfficeManagement.sbo.ip} /bin/bash <<SBO
            sudo -- bash -c "
            yes ${newPasswords.sbo} | passwd entringo
            "
            `;
    
        //Change password of the Area Servers and Access Gates belonging to the Back Office.
        backOfficeManagement.sbo.las.forEach((areaServer,areaServerIndex) => {
    
            //Check if Area Server is local to the Back Office.
            if(backOfficeManagement.sbo.ip == areaServer.ip){
    
                //Change passwords of the Access Gates belonging to the Area Server.
                areaServer.hal.forEach((accessGate,accessGateIndex) => {
                    
                    //Check if Access Gate is local to the Back Office.
                    if(accessGate.ip == areaServer.ip){
                        //Do nothing.                 
                    }
                    else{

                        //Change password of the Access Gate.
                        commands = commands.concat(`
                            ssh -i ~/.ssh/las.key -p ${accessGate.port} entringo@${accessGate.ip} /bin/bash <<HAL${accessGateIndex}
                            sudo -- bash -c "
                            yes ${newPasswords.hal} | passwd entringo
                            "
                            HAL${accessGateIndex}`);         
                    }
                });
            }
            else{

                //Change password of the Area Server.
                commands = commands.concat(`
                    ssh -i ~/.ssh/sbo.key -p ${areaServer.port} entringo@${areaServer.ip} /bin/bash <<LAS${areaServerIndex}
                    sudo -- bash -c "
                    yes ${newPasswords.las} | passwd entringo
                    "
                    `);
    
                //Change passwords of the Access Gates belonging to the Area Server.
                areaServer.hal.forEach((accessGate,accessGateIndex) => {
                    
                    //Check if Access Gate is local to the Area Server.
                    if(accessGate.ip == areaServer.ip){
                        //Do nothing.
                    }
                    else{

                        //Change password of the Access Gate.
                        commands = commands.concat(`
                            ssh -i ~/.ssh/las.key -p ${accessGate.port} entringo@${accessGate.ip} /bin/bash <<HAL${accessGateIndex}
                            sudo -- bash -c "
                            yes ${newPasswords.hal} | passwd entringo
                            "
                            HAL${accessGateIndex}`);         
                    }
                });
    
                //Add delimiter.
                commands = commands.concat(`
                    LAS${areaServerIndex}`);
            }
        });
    
        //Add delimiter.
        commands = commands.concat(`
            SBO
            echo ${JSON.stringify(newPasswords,null,5)} > ${backOfficePath}/passwords.txt`);
    
        //Cut the indendation.
        commands = commands.replace(/(\n)\s+/g, '$1');
    
        terminal.runBash(commands);
    },    
    //Function for creating the directories required by the system.
    directories(backOfficeManagement){

        //Create the system directories for the Back Office.
        let commands =`
            #!/bin/bash
            ssh -i ~/.ssh/${config.SSHkey} -p ${backOfficeManagement.sbo.port} entringo@${backOfficeManagement.sbo.ip} /bin/bash <<SBO
            sudo -- bash -c "
            mkdir /entringo
            mkdir /entringo/Entringo-Numbers
            mkdir /entringo/Entringo-Certificates
            mkdir /entringo/temp
            mkdir /entringo/update
            mkdir /entringo/sbo
            "
            `;
    
        //Create the system directories for the Area Servers and Access Gates belonging to the Back Office.
        backOfficeManagement.sbo.las.forEach((areaServer,areaServerIndex) => {
    
            //Check if Area Server is local to the Back Office.
            if(backOfficeManagement.sbo.ip == areaServer.ip){
                commands = commands.concat(`
                    sudo -- bash -c "
                    mkdir /entringo/las
                    "
                    `);
    
                //Create the system directories for the Access Gates belonging to the Area Server.
                areaServer.hal.forEach((accessGate,accessGateIndex) => {
                    
                    //Check if Access Gate is local to the Back Office.
                    if(accessGate.ip == areaServer.ip){
                        commands = commands.concat(`
                            sudo -- bash -c "
                            mkdir /entringo/hal
                            "
                            `);
    
                    }
                    else{

                        //Create the system directories for the Access Gate.
                        commands = commands.concat(`
                            ssh -i ~/.ssh/las.key -p ${accessGate.port} entringo@${accessGate.ip} /bin/bash <<HAL${accessGateIndex}
                            sudo -- bash -c "
                            mkdir /entringo
                            mkdir /entringo/Entringo-Certificates
                            mkdir /entringo/temp
                            mkdir /entringo/update
                            mkdir /entringo/hal
                            chown -R entringo:entringo /entringo
                            chmod -R 700 /entringo
                            "
                            HAL${accessGateIndex}`);         
                    }
                });
            }
            else{

                //Create the system directories for the Area Server.
                commands = commands.concat(`
                    ssh -i ~/.ssh/sbo.key -p ${areaServer.port} entringo@${areaServer.ip} /bin/bash <<LAS${areaServerIndex}
                    sudo -- bash -c "
                    mkdir /entringo
                    mkdir /entringo/Entringo-Numbers
                    mkdir /entringo/Entringo-Certificates
                    mkdir /entringo/temp
                    mkdir /entringo/update
                    mkdir /entringo/las
                    "
                    `);
    
                //Create the system directories for the Access Gates belonging to the Area Server.
                areaServer.hal.forEach((accessGate,accessGateIndex) => {
                    
                    //Check if Access Gate is local to the Area Server.
                    if(accessGate.ip == areaServer.ip){
                        commands = commands.concat(`
                            sudo -- bash -c "
                            mkdir /entringo/hal
                            "
                            `);
    
                    }
                    else{

                        //Create the system directories for the Access Gate.
                        commands = commands.concat(`
                            ssh -i ~/.ssh/las.key -p ${accessGate.port} entringo@${accessGate.ip} /bin/bash <<HAL${accessGateIndex}
                            sudo -- bash -c "
                            mkdir /entringo
                            mkdir /entringo/Entringo-Certificates
                            mkdir /entringo/temp
                            mkdir /entringo/update
                            mkdir /entringo/hal
                            chown -R entringo:entringo /entringo
                            chmod -R 700 /entringo
                            "
                            HAL${accessGateIndex}`);         
                    }
                });
    
                //Add delimiter.
                commands = commands.concat(`
                    sudo -- bash -c "
                    chown -R entringo:entringo /entringo
                    chmod -R 700 /entringo
                    "
                    LAS${areaServerIndex}`);
            }
        });
    
        //Add delimiter.
        commands = commands.concat(`
            sudo -- bash -c "
            chown -R entringo:entringo /entringo
            chmod -R 700 /entringo
            "
            SBO`);
    
        //Cut the indendation.
        commands = commands.replace(/(\n)\s+/g, '$1');
    
        terminal.runBash(commands);
    },
    //Function for the deployment of system certificates.
    certificates(backOfficePath,backOfficeManagement){

        //Deploy the certificates to the Back Office.
        let commands =`
            #!/bin/bash
            scp -r -i ~/.ssh/${config.SSHkey} -P ${backOfficeManagement.sbo.port} ${backOfficePath}/Entringo-Certificates entringo@${backOfficeManagement.sbo.ip}:/entringo/
            ssh -i ~/.ssh/${config.SSHkey} -p ${backOfficeManagement.sbo.port} entringo@${backOfficeManagement.sbo.ip} /bin/bash <<SBO
            chmod 600 /entringo/Entringo-Certificates/*
            `;
    
        //Deploy the certificates to the Area Servers and Access Gates belonging to the Back Office.
        backOfficeManagement.sbo.las.forEach((areaServer,areaServerIndex) => {
    
            //Check if Area Server is local to the Back Office.
            if(backOfficeManagement.sbo.ip == areaServer.ip){
    
                //Deploy the certificates to the Access Gates belonging to the Area Server.
                areaServer.hal.forEach((accessGate,accessGateIndex) => {
                    
                    //Check if Access Gate is local to the Area Server.
                    if(accessGate.ip == areaServer.ip){
                        //Do nothing.
                    }
                    else{

                        //Deploy the certificates to the Access Gate.
                        commands = commands.concat(`
                            scp -r -i ~/.ssh/las.key -P ${accessGate.port} /entringo/Entringo-Certificates/\{EntringoCA.crt,HAL_Server.crt,HAL_Server.key,LAS_Client.key,LAS_Client.crt\} entringo@${accessGate.ip}:/entringo/Entringo-Certificates/
                            ssh -i ~/.ssh/las.key -p ${accessGate.port} entringo@${accessGate.ip} /bin/bash <<HAL${accessGateIndex}
                            chmod 600 /entringo/Entringo-Certificates/*
                            HAL${accessGateIndex}`);         
                    }
                });
            }
            else{

                //Deploy the certificates to the Area Server.
                commands = commands.concat(`
                    scp -r -i ~/.ssh/sbo.key -P ${areaServer.port} /entringo/Entringo-Certificates/\{EntringoCA.crt,SBO_Client.crt,LAS_Server.crt,LAS_Server.key,SBO_Client.key,HAL_Server.crt,HAL_Server.key,LAS_Client.key,LAS_Client.crt\} entringo@${areaServer.ip}:/entringo/Entringo-Certificates/
                    ssh -i ~/.ssh/sbo.key -p ${areaServer.port} entringo@${areaServer.ip} /bin/bash <<LAS${areaServerIndex}
                    chmod 600 /entringo/Entringo-Certificates/*
                    `);
    
                //Deploy the certificates to the Access Gates belonging to the Area Server.
                areaServer.hal.forEach((accessGate,accessGateIndex) => {
                    
                    //Check if Access Gate is local to the Area Server.
                    if(accessGate.ip == areaServer.ip){
                        //Do nothing.
                    }
                    else{

                        //Deploy the certificates to the Access Gate.
                        commands = commands.concat(`
                        scp -r -i ~/.ssh/las.key -P ${accessGate.port} /entringo/Entringo-Certificates/\{EntringoCA.crt,HAL_Server.crt,HAL_Server.key,LAS_Client.key,LAS_Client.crt\} entringo@${accessGate.ip}:/entringo/Entringo-Certificates/
                        ssh -i ~/.ssh/las.key -p ${accessGate.port} entringo@${accessGate.ip} /bin/bash <<HAL${accessGateIndex}
                        chmod 600 /entringo/Entringo-Certificates/*
                        HAL${accessGateIndex}`);           
                    }
                });
    
                //Add delimiter.
                commands = commands.concat(`
                    LAS${areaServerIndex}`);
            }
        });
    
        //Add delimiter.
        commands = commands.concat(`
            SBO`);
    
        //Cut the indendation.
        commands = commands.replace(/(\n)\s+/g, '$1');
    
        terminal.runBash(commands);
    },
    //Function for the deployment of accessory systems required for the system components to function.
    accessorySystems: function (backOfficeManagement,systemConfiguration) {

        //Configure the accessory systems required for the Back Office to function: PostgreSQL database and Elasticsearch-OSS.
        let commands =`
            #!/bin/bash
            ssh -i ~/.ssh/${config.SSHkey} -p ${backOfficeManagement.sbo.port} entringo@${backOfficeManagement.sbo.ip} /bin/bash <<SBO
            sudo -- bash -c "
            export errors=''
            export pgerrors=''
            echo 'Processing Backoffice.'
            #PostgreSQL
            echo 'Checking PostgreSQL Install.'
            dpkg --status postgresql-12 | grep '^Status: install ok installed'
            if [ \$? -eq 0 ] 
                then
                echo 'PostgreSQL already installed, checking version.'
                dpkg --status postgresql-12 | grep '^Version: 12'
                if [ \$? -eq 0 ] 
                then
                    echo 'Correct PostgreSQL version already installed.'
                    su postgres
                    psql
                    CREATE DATABASE sbo; CREATE USER sbo WITH ENCRYPTED PASSWORD '${systemConfiguration.sbo.DBPassword}'; GRANT ALL PRIVILEGES ON DATABASE sbo TO sbo;
                    \c sbo
                    CREATE EXTENSION pgcrypto; CREATE EXTENSION pg_trgm; CREATE EXTENSION btree_gist;
                    \q
                    exit
                    echo 'PostgreSQL-12 Backoffice database configured.'
                else
                    echo 'Incorrect PostgreSQL version installed, expected version 12, please remove or reconfigure manually.'
                    export errors=\$errors'\nIncorrect PostgreSQL version installed, expected version 12, please remove or reconfigure manually.'
                    export pgerrors=\$pgerrors'1'
    
                fi
            else
                echo 'PostgreSQL-12 not installed, installing.'
                apt-get install postgresql-12 -y
                if [ \$? -eq 0 ] 
                then
                    sed -i -e '/^log_timezone.*/s/Etc\/UTC/${systemConfiguration.sbo.LocalTimeZone}/' -e '/^timezone.*/s/Etc\/UTC/${systemConfiguration.sbo.LocalTimeZone}/' /etc/postgresql/12/main/postgresql.conf
                    systemctl restart postgresql
                    echo 'PostgreSQL-12 Timezones reconfigured.'
                    su postgres
                    psql
                    CREATE DATABASE sbo; CREATE USER sbo WITH ENCRYPTED PASSWORD '${systemConfiguration.sbo.DBPassword}'; GRANT ALL PRIVILEGES ON DATABASE sbo TO sbo;
                    \c sbo
                    CREATE EXTENSION pgcrypto; CREATE EXTENSION pg_trgm; CREATE EXTENSION btree_gist;
                    \q
                    exit
                    echo 'PostgreSQL-12 Backoffice database configured.'
                else
                    echo 'Error(s) occured while installing PostgreSQL version 12, please resolve manually.'
                    export errors=\$errors'\nError(s) occured while installing PostgreSQL version 12, please resolve manually.'
                    export pgerrors=\$pgerrors'1'
                fi
            fi
            #Elasticsearch-OSS 
            echo 'Checking Elasticsearch-OSS Install.'
            dpkg --status elasticsearch-oss | grep '^Status: install ok installed'
            if [ \$? -eq 0 ] 
                then
                echo 'Elasticsearch-OSS already installed, checking version.'
                dpkg --status elasticsearch-oss | grep '^Version: 6.4.2'
                if [ \$? -eq 0 ] 
                then
                    echo 'Correct Elasticsearch-OSS version already installed.'
                else
                    echo 'Incorrect Elasticsearch-OSS version installed, expected version 6.4.2, please remove or reconfigure manually.'
                    export errors=\$errors'\nIncorrect Elasticsearch-OSS version installed, expected version 6.4.2, please remove or reconfigure manually.'
                fi
            else
                echo 'Elasticsearch-OSS-6.4.2 not installed, installing.'
                apt-get install -y openjdk-11-jre
                if [ \$? -eq 0 ] 
                then
                    wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-oss-6.4.2.deb
                    if [ \$? -eq 0 ] 
                    then
                        dpkg -i elasticsearch-oss-6.4.2.deb
                        if [ \$? -eq 0 ] 
                        then
                            systemctl enable elasticsearch
                            systemctl start elasticsearch
                            echo 'Elasticsearch-OSS-6.4.2 installed.'
                        else
                            echo 'Error(s) occured while installing Elasticsearch-OSS, please resolve manually.'
                            export errors=\$errors'\nError(s) occured while installing Elasticsearch-OSS, please resolve manually.'
                        fi
                    else
                        echo 'Error(s) occured while downloading Elasticsearch-OSS, please resolve manually.'
                        export errors=\$errors'\nError(s) occured while downloading Elasticsearch-OSS, please resolve manually.'
                    fi
                else
                    echo 'Error(s) occured while installing Elasticsearch-OSS dependecy openjdk-11-jre, please resolve manually.'
                    export errors=\$errors'\nError(s) occured while installing Elasticsearch-OSS dependecy openjdk-11-jre, please resolve manually.'
                fi
            fi
            if [ \$errors -eq '' ] 
            then
                echo 'Backoffice processed without errors.'
            else
                echo -e Error(s) occured while processing Backoffice:\$errors
            fi
            "
            `;
    
        //Configure the accessory systems required for the Area Servers to function: PostgreSQL database.
        backOfficeManagement.sbo.las.forEach((areaServer,areaServerIndex) => {
    
            //If Area Server is local to the Back Office add another database.
            if(backOfficeManagement.sbo.ip == areaServer.ip){
                commands = commands.concat(`sudo -- bash -c "
                    if [ \$pgerrors -eq '' ] 
                    then
                        su postgres
                        psql
                        CREATE DATABASE las; CREATE USER las WITH ENCRYPTED PASSWORD '${systemConfiguration.sbo.las[areaServerIndex].DBPassword}'; GRANT ALL PRIVILEGES ON DATABASE las TO las;
                        \c las
                        CREATE EXTENSION pgcrypto; CREATE EXTENSION pg_trgm; CREATE EXTENSION btree_gist;
                        \q
                        exit
                        echo 'PostgreSQL-12 Area Server ${areaServerIndex} database configured.'
                    else
                        echo 'PostgreSQL-12 Area Server ${areaServerIndex} database configuration skipped due to earlier errors.'
                    fi
                    "`);
            }
            else{

                //Install and configure the database.
                commands = commands.concat(`
                    ssh -i ~/.ssh/sbo.key -p ${areaServer.port} entringo@${areaServer.ip} /bin/bash <<LAS${areaServerIndex}
                    sudo -- bash -c "
                    export errors=''
                    #PostgreSQL
                    echo 'Checking PostgreSQL Install.'
                    dpkg --status postgresql | grep '^Status: install ok installed'
                    if [ \$? -eq 0 ] 
                        then
                        echo 'PostgreSQL already installed, checking version.'
                        dpkg --status postgresql | grep '^Version: 12'
                        if [ \$? -eq 0 ] 
                        then
                            echo 'Correct PostgreSQL version already installed.'
                            sed -i -e '/^log_timezone.*/s/Etc\/UTC/${systemConfiguration.sbo.LocalTimeZone}/' -e '/^timezone.*/s/Etc\/UTC/${systemConfiguration.sbo.LocalTimeZone}/' /etc/postgresql/12/main/postgresql.conf
                            systemctl restart postgresql
                            echo 'PostgreSQL-12 Timezones reconfigured.'
                            su postgres
                            psql
                            CREATE DATABASE las; CREATE USER las WITH ENCRYPTED PASSWORD '${systemConfiguration.sbo.las[areaServerIndex].DBPassword}'; GRANT ALL PRIVILEGES ON DATABASE las TO las;
                            \c las
                            CREATE EXTENSION pgcrypto; CREATE EXTENSION pg_trgm; CREATE EXTENSION btree_gist;
                            \q
                            exit
                            echo 'PostgreSQL-12 Area Server ${areaServerIndex} database configured.
                        else
                            echo 'Incorrect PostgreSQL version installed, expected version 12, please remove or reconfigure manually.'
                            export errors=\$errors'\nIncorrect PostgreSQL version installed, expected version 12, please remove or reconfigure manually.'
                        fi
                    else
                        echo 'PostgreSQL-12 not installed, installing.'
                        apt-get install postgresql-12 -y
                        if [ \$? -eq 0 ] 
                        then
                            sed -i -e '/^log_timezone.*/s/Etc\/UTC/${systemConfiguration.sbo.LocalTimeZone}/' -e '/^timezone.*/s/Etc\/UTC/${systemConfiguration.sbo.LocalTimeZone}/' /etc/postgresql/12/main/postgresql.conf
                            systemctl restart postgresql
                            echo 'PostgreSQL-12 Timezones reconfigured.'
                            su postgres
                            psql
                            CREATE DATABASE las; CREATE USER las WITH ENCRYPTED PASSWORD '${systemConfiguration.sbo.las[areaServerIndex].DBPassword}'; GRANT ALL PRIVILEGES ON DATABASE las TO las;
                            \c las
                            CREATE EXTENSION pgcrypto; CREATE EXTENSION pg_trgm; CREATE EXTENSION btree_gist;
                            \q
                            exit
                            echo 'PostgreSQL-12 Area Server ${areaServerIndex} database configured.'
                        else
                            echo 'Error(s) occured while installing PostgreSQL version 12, please resolve manually.'
                            export errors=\$errors'\nError(s) occured while installing PostgreSQL version 12, please resolve manually.'
                        fi
                    fi
                    echo -e Error(s) occured:\$errors
                    "
                    `);
    
                //Add delimiter
                commands = commands.concat(`
                    LAS${areaServerIndex}`);
            }
        });
    
        //Add delimiter
        commands = commands.concat(`
            SBO`);
    
        //Cut the indendation
        commands = commands.replace(/(\n)\s+/g, '$1');
    
        terminal.runBash(commands)
    },
    //Function to deploy the system applications.
    applications: function (version,backOfficePath,backOfficeManagement) {
    
        //Organise the required version files before copying them the the Back Office.
        let organiseCommands = `
            #!/bin/bash
            cp -r ${config.baseDirectory}/versions/${version}/ ${config.baseDirectory}/update/
            if [ -d "${config.baseDirectory}/temp" ]; 
                then
                echo 'Removing previous temporary directory contents.'
                rm -r ${config.baseDirectory}/temp/*
            fi
            mkdir ${config.baseDirectory}/temp/sbo
            cp ${backOfficePath}/config.json ${config.baseDirectory}/temp/sbo/config.json 
            `;
    
        //Deploy the Back Office.
        let commands =`
            scp -r -i ~/.ssh/${config.SSHkey} -P ${backOfficeManagement.sbo.port} ${config.baseDirectory}/\{update,temp\} entringo@${backOfficeManagement.sbo.ip}:/entringo/
            ssh -i ~/.ssh/${config.SSHkey} -p ${backOfficeManagement.sbo.port} entringo@${backOfficeManagement.sbo.ip} /bin/bash <<SBO
            sudo -- bash -c "
            #Create systemctl daemon
            echo '[Unit]
            Description=Entringo SBO
            After=network.target
            StartLimitIntervalSec=0

            [Service]
            Type=simple
            Restart=always
            RestartSec=1
            User=entringo
            ExecStart=/entringo/las/sbo
            WorkingDirectory=/entringo/sbo

            [Install]
            WantedBy=multi-user.target
            ' > /etc/systemd/system/sbo.service

            systemctl daemon-reload
            systemctl enable sbo.service
    
            #App
            cp -rf /entringo/update/sbo /entringo/
            cp /entringo/temp/sbo/config.json /entringo/sbo/
            chmod 600 /entringo/sbo/*
            chmod 700 /entringo/sbo/sbo
            chown -R entringo:entringo /entringo/*
    
            #Start new service
            systemctl start sbo
            "`;
    
        //Deploy the Area Servers and Access Gates belonging to the Back Office.
        backOfficeManagement.sbo.las.forEach((areaServer,areaServerIndex) => {
    
            organiseCommands = organiseCommands.concat(`
                mkdir ${config.baseDirectory}/temp/sbo/las${areaServerIndex}
                cp ${backOfficePath}/\'${areaServer.name}\'/config.json ${config.baseDirectory}/temp/sbo/las${areaServerIndex}/config.json
                `);
    
            //Check if the Area Server is local to the Back Office.
            if(backOfficeManagement.sbo.ip == areaServer.ip){

                //Deploy the Area Server.
                commands = commands.concat(`
                    sudo -- bash -c "
                    #Create systemctl daemon
                    echo '[Unit]
                    Description=Entringo LAS
                    After=network.target
                    StartLimitIntervalSec=0

                    [Service]
                    Type=simple
                    Restart=always
                    RestartSec=1
                    User=entringo
                    ExecStart=/entringo/las/las
                    WorkingDirectory=/entringo/las

                    [Install]
                    WantedBy=multi-user.target
                    ' > /etc/systemd/system/las.service

                    systemctl daemon-reload
                    systemctl enable las.service
            
                    #App
                    cp -rf /entringo/update/las /entringo/
                    cp /entringo/temp/sbo/las${areaServerIndex}/config.json /entringo/las/
                    chmod 600 /entringo/las/*
                    chmod 700 /entringo/las/las
                    chown -R entringo:entringo /entringo/*
            
                    #Start new service
                    systemctl start las
                    "`);
    
                //Deploy the Access Gates belonging to the Area Server.
                areaServer.hal.forEach((accessGate,accessGateIndex) => {
    
                    organiseCommands = organiseCommands.concat(`
                        mkdir ${config.baseDirectory}/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}
                        cp ${backOfficePath}/\'${areaServer.name}\'/\'${accessGate.name}\'/config.json ${config.baseDirectory}/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}/config.json
                        `);
                    
                    //Check if the Access Gate is local to the Back Office.
                    if(accessGate.ip == areaServer.ip){

                        //Deploy the Access Gate.
                        commands = commands.concat(`
                            sudo -- bash -c "
                            #Create systemctl daemon
                            echo '[Unit]
                            Description=Entringo HAL
                            After=network.target
                            StartLimitIntervalSec=0

                            [Service]
                            Type=simple
                            Restart=always
                            RestartSec=1
                            User=entringo
                            ExecStart=/entringo/hal/hal
                            WorkingDirectory=/entringo/hal

                            [Install]
                            WantedBy=multi-user.target
                            ' > /etc/systemd/system/hal.service

                            systemctl daemon-reload
                            systemctl enable hal.service
                    
                            #App
                            cp -rf /entringo/update/hal /entringo/
                            cp /entringo/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}/config.json /entringo/hal/
                            chmod 600 /entringo/hal/*
                            chmod 700 /entringo/hal/static
                            chmod 700 /entringo/hal/templates
                            chmod 700 /entringo/hal/hal
                            chown -R entringo:entringo /entringo/*
                    
                            #Start new service
                            systemctl start hal
                            "`);
    
                    }
                    else{

                        //Deploy the Access Gate.
                        commands = commands.concat(`
                            scp -r -i ~/.ssh/las.key -P ${accessGate.port} /entringo/update/hal entringo@${accessGate.ip}:/entringo/update/
                            scp -r -i ~/.ssh/las.key -P ${accessGate.port} /entringo/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}/config.json entringo@${accessGate.ip}:/entringo/update/hal/
                            ssh -i ~/.ssh/las.key -p ${accessGate.port} entringo@${accessGate.ip} /bin/bash <<HAL${accessGateIndex}
                            sudo -- bash -c "
                            #Create systemctl daemon
                            echo '[Unit]
                            Description=Entringo HAL
                            After=network.target
                            StartLimitIntervalSec=0

                            [Service]
                            Type=simple
                            Restart=always
                            RestartSec=1
                            User=entringo
                            ExecStart=/entringo/hal/hal
                            WorkingDirectory=/entringo/hal

                            [Install]
                            WantedBy=multi-user.target
                            ' > /etc/systemd/system/hal.service

                            systemctl daemon-reload
                            systemctl enable hal.service
                    
                            #App
                            cp -rf /entringo/update/hal /entringo/
                            chmod 600 /entringo/hal/*
                            chmod 700 /entringo/hal/static
                            chmod 700 /entringo/hal/templates
                            chmod 700 /entringo/hal/hal
                            chown -R entringo:entringo /entringo/*
                    
                            #Start new service
                            systemctl start hal
    
                            rm -rf /entringo/update/*
                            "
                            HAL${accessGateIndex}`);         
                    }
                });
            }
            else{

                //Deploy the Area Server.
                commands = commands.concat(`
                    scp -r -i ~/.ssh/sbo.key -P ${areaServer.port} /entringo/update/\{las,hal\} entringo@${areaServer.ip}:/entringo/update/
                    scp -r -i ~/.ssh/sbo.key -P ${areaServer.port} /entringo/temp/sbo/las${areaServerIndex} entringo@${areaServer.ip}:/entringo/temp/
                    ssh -i ~/.ssh/sbo.key -p ${areaServer.port} entringo@${areaServer.ip} /bin/bash <<LAS${areaServerIndex}
                    sudo -- bash -c "
                    #Create systemctl daemon
                    echo '[Unit]
                    Description=Entringo LAS
                    After=network.target
                    StartLimitIntervalSec=0

                    [Service]
                    Type=simple
                    Restart=always
                    RestartSec=1
                    User=entringo
                    ExecStart=/entringo/las/las
                    WorkingDirectory=/entringo/las

                    [Install]
                    WantedBy=multi-user.target
                    ' > /etc/systemd/system/las.service

                    systemctl daemon-reload
                    systemctl enable las.service
            
                    #App
                    cp -rf /entringo/update/las /entringo/
                    cp /entringo/temp/las${areaServerIndex}/config.json /entringo/las/
                    chmod 600 /entringo/las/*
                    chmod 700 /entringo/las/las
                    chown -R entringo:entringo /entringo/*
            
                    #Start new service
                    systemctl start las
                    "`);
    
                //Deploy the Access Gates belonging to the Area Server.
                areaServer.hal.forEach((accessGate,accessGateIndex) => {
    
                    organiseCommands = organiseCommands.concat(`
                        mkdir ${config.baseDirectory}/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}
                        cp ${backOfficePath}/\'${areaServer.name}\'/\'${accessGate.name}\'/config.json ${config.baseDirectory}/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}/config.json
                        `);
                    
                    //Check if the Access is local to the Area Server.
                    if(accessGate.ip == areaServer.ip){

                        //Deploy the Access Gate.
                        commands = commands.concat(`
                            sudo -- bash -c "
                            #Create systemctl daemon
                            echo '[Unit]
                            Description=Entringo HAL
                            After=network.target
                            StartLimitIntervalSec=0

                            [Service]
                            Type=simple
                            Restart=always
                            RestartSec=1
                            User=entringo
                            ExecStart=/entringo/hal/hal
                            WorkingDirectory=/entringo/hal

                            [Install]
                            WantedBy=multi-user.target
                            ' > /etc/systemd/system/hal.service

                            systemctl daemon-reload
                            systemctl enable hal.service
                    
                            #App
                            cp -rf /entringo/update/hal /entringo/
                            cp /entringo/temp/las${areaServerIndex}/hal${accessGateIndex}/config.json /entringo/hal/
                            chmod 600 /entringo/hal/*
                            chmod 700 /entringo/hal/static
                            chmod 700 /entringo/hal/templates
                            chmod 700 /entringo/hal/hal
                            chown -R entringo:entringo /entringo/*
                    
                            #Start new service
                            systemctl start hal
                            "`);
    
                    }
                    else{

                        //Deploy the Access Gate.
                        commands = commands.concat(`
                            scp -r -i ~/.ssh/las.key -P ${accessGate.port} /entringo/update/hal entringo@${accessGate.ip}:/entringo/update/
                            scp -r -i ~/.ssh/las.key -P ${accessGate.port} /entringo/temp/las${areaServerIndex}/hal${accessGateIndex}/config.json entringo@${accessGate.ip}:/entringo/update/hal/
                            ssh -i ~/.ssh/las.key -p ${accessGate.port} entringo@${accessGate.ip} /bin/bash <<HAL${accessGateIndex}
                            sudo -- bash -c "
                            #Create systemctl daemon
                            echo '[Unit]
                            Description=Entringo HAL
                            After=network.target
                            StartLimitIntervalSec=0

                            [Service]
                            Type=simple
                            Restart=always
                            RestartSec=1
                            User=entringo
                            ExecStart=/entringo/hal/hal
                            WorkingDirectory=/entringo/hal

                            [Install]
                            WantedBy=multi-user.target
                            ' > /etc/systemd/system/hal.service

                            systemctl daemon-reload
                            systemctl enable hal.service
                    
                            #App
                            cp -rf /entringo/update/hal /entringo/
                            chmod 600 /entringo/hal/*
                            chmod 700 /entringo/hal/static
                            chmod 700 /entringo/hal/templates
                            chmod 700 /entringo/hal/hal
                            chown -R entringo:entringo /entringo/*
                    
                            #Start new service
                            systemctl start hal
    
                            rm -rf /entringo/update/*
                            "
                            HAL${accessGateIndex}`);         
                    }
                });
    
                //Add delimiter.
                commands = commands.concat(`
                    rm -rf /entringo/update/*
                    rm -rf /entringo/temp/*
                    LAS${areaServerIndex}`);
            }
        });
    
        //Add delimiter.
        commands = commands.concat(`
            rm -rf /entringo/update/*
            rm -rf /entringo/temp/*
            SBO`);
    
        //Add the organisational commands to be run before the others.
        commands = organiseCommands.concat(commands);
    
        //Cut the indendation.
        commands = commands.replace(/(\n)\s+/g, '$1');
    
        terminal.runBash(commands);
    },
    //Function to load the configuration for the system which is to be deployed.
    loadConfiguration: function(backOfficePath,backOfficeManagement){
        
        let configuration= {};

        //Load the configuration for the Back Office.
        configuration.sbo = JSON.parse(fs.readFileSync(backOfficePath.replace(/'/g, '')+'/config.json'));
        configuration.sbo.las=[];

        //Load the configuration for all the Area Servers and Access Gates.
        backOfficeManagement.sbo.las.forEach((areaServer,areaServerIndex) => {
    
            //Load the configuration for all the Area Servers.
            configuration.sbo.las[areaServerIndex] = JSON.parse(fs.readFileSync(backOfficePath.replace(/'/g, '') + '/' + areaServer.name + '' + '/config.json'));
            configuration.sbo.las[areaServerIndex].hal = [];

            areaServer.hal.forEach((accessGate,accessGateIndex) => {
                
                //Load the configuration for all the Access Gates.
                configuration.sbo.las[areaServerIndex].hal[accessGateIndex] = JSON.parse(fs.readFileSync(backOfficePath.replace(/'/g, '') + '/' + areaServer.name + '' + '/' + accessGate.name + '' + '/config.json'));

            });
        });  

        return configuration;
    },
    //Function to verify if the system has been deployed previously.
    verify: function(backOfficeManagement){
        
        try{
            if(backOfficeManagement.deployed == true){
                throw('The selected system has already been deployed!')
            }
            else{
                return inquirer.prompt([
                    {
                        type: 'confirm',
                        prefix: '',
                        name: 'confirmation',
                        message: 'The selected system can be deployed, continue?:'
                    }
                ]).then((answer) => {
                    if(answer.confirmation){
                        return true;
                    }
                    else{
                        return false;
                    }
                });
            }
        }
        catch(errors) {
            console.log(errors);
            return false;
        }
    },
    //Function to run all functions for system deployment.
    all: async function(backOfficePath) {

        try{

            //Check if parameter was passed.
            if(typeof backOfficePath === 'undefined'){
                backOfficePath = await general.select.system();
            }

            let backOfficeManagement = JSON.parse(fs.readFileSync(backOfficePath.replace(/'/g, '')+'/management.json'));

            //Verify if the system has not yet been deployed, and mark the system as now deployed.
            if(!(await this.verify(backOfficeManagement))){
                throw('System deployment aborted!');
            }
            else{
                backOfficeManagement.deployed = true;
                fs.writeFileSync(backOfficePath.replace(/'/g, '')+'/management.json',JSON.stringify(backOfficeManagement,null,5));
            }

            //Load system version and configuration.
            let version = await general.select.version();
            let systemConfiguration = await this.loadConfiguration(backOfficePath,backOfficeManagement);

            await this.SSHKeys(backOfficeManagement);

            //Generate new passwords and change the system passwords.
            let newPasswords = {
                sbo: randomstring.generate(32),
                las: randomstring.generate(32),
                hal: randomstring.generate(32)
            };

            await this.changePasswords(newPasswords,backOfficePath,backOfficeManagement);

            //Deploy all the required files, and programms.
            await this.directories(backOfficeManagement);
            await this.certificates(backOfficePath,backOfficeManagement);
            await this.accessorySystems(backOfficeManagement,systemConfiguration);
            await this.applications(version,backOfficeManagement,systemConfiguration);
            
            console.log('System deployed!')

            return 0;
        }
        catch(errors){
            console.log('Error(s) occured while deploying system!');
            console.log(errors);
        }
    }
}

//General functions for system management.
var general = {
    //Functions for system selection.
    select:{
        input: {},
        //Function for country selection.
        country: async function() {
        
            return inquirer.prompt([
                {
                    type: 'list',
                    prefix: '',
                    name: 'country',
                    message: 'Select country the system is located in:',
                    choices: fs.readdirSync(config.baseDirectory + '/countries')
                }])
            .then((answer) => {
                return this.input.country = answer.country;
            });   
        },
        //Function for owner selection.
        owner: async function() {

            return inquirer.prompt([
                {
                    type: 'list',
                    prefix: '',
                    name: 'owner',
                    message: 'Select the system owner:',
                    choices: fs.readdirSync(config.baseDirectory + '/countries' + '/' + this.input.country)
                }
            ]).then((answer) => {
                return this.input.owner = answer.owner;
            });
        },
        //Function for Back Office selection.
        backOffice: async function() {

            return inquirer.prompt([
                {
                    type: 'list',
                    prefix: '',
                    name: 'backOffice',
                    message: 'Select the system Back Office:',
                    choices: fs.readdirSync(config.baseDirectory + '/countries' + '/' + this.input.country + '/' + this.input.owner)
                }
            ]).then((answer) => {
                return this.input.backOffice = answer.backOffice;
            });
        },
        //Function for version selection.
        version: async function() {
        
            return inquirer.prompt([
                {
                    type: 'list',
                    prefix: '',
                    name: 'version',
                    message: 'Select the version to deploy:',
                    choices: fs.readdirSync(config.baseDirectory + '/versions')
                }
            ]).then((answer) => {
                return answer.version;
            });
        },
        //Function for Area Server selection during SSH connection.
        areaServer: async function(backOfficeManagement) {

            //Create an array of Area Server names belonging to the Back Office.
            let areaServerNames = [];

            //If the Area Server is not local to the Back Office add it to the list of available connections.
            backOfficeManagement.sbo.las.forEach((areaServer,areaServerIndex) => {
                if(backOfficeManagement.sbo.ip != areaServer.ip){
                    areaServerNames.push(areaServer.name)
                }
            });

            return inquirer.prompt([
                {
                    type: 'list',
                    prefix: '',
                    name: 'areaServer',
                    message: 'Select the Area Server you wish to connect to, or select "Connect to this device" if you wish to connect to the Back Office:',
                    choices: [areaServerNames,new inquirer.Separator(),'Connect to this device'].flat()
                }
            ]).then((answer) => {

                //Return null if connection is to be made to the Back Office, or Area Server Index otherwise.
                if(answer.areaServer === 'Connect to this device'){
                    return null;
                }
                else{
                    return this.input.areaServer = areaServerNames.indexOf(answer.areaServer);
                }
            });
        },
        //Function for Access Gate selection during SSH connection.
        accessGate: async function(backOfficeManagement,areaServerIndex) {

            let accessGateNames = [];

            //If the Access Gate is not local to the Area Server add it to the list of available connections.
            backOfficeManagement.sbo.las[areaServerIndex].hal.forEach((accessGate,accessGateIndex) => {
                if(backOfficeManagement.sbo.las[areaServerIndex].ip != accessGate.ip){
                    accessGateNames.push(accessGate.name)
                }
            });

            return inquirer.prompt([
                {
                    type: 'list',
                    prefix: '',
                    name: 'accessGate',
                    message: 'Select the Access Gate you wish to connect to, or select "Connect to this device" if you wish to connect to the Area Server:',
                    choices: [accessGateNames,new inquirer.Separator(),'Connect to this device'].flat()
                }
            ]).then((answer) => {
                
                //Return null if connection is to be made to the Area Server, or Access Gate Index otherwise.
                if(answer.accessGate === 'Connect to this device'){
                    return null;
                }
                else{
                    return this.input.accessGate = accessGateNames.indexOf(answer.accessGate);
                }
            });
        },    
        //Function for device selection for SSH connection.
        SSH: async function() {

            //Run function for system selection.
            let backOfficePath = await general.select.system();
            
            let backOfficeManagement = JSON.parse(fs.readFileSync(backOfficePath.replace(/'/g, '')+'/management.json'));

            //Check if the system is deployed.
            if(backOfficeManagement.deployed == true){
                throw('The selected system has not been deployed!');
            }

            //Prompt the user for the device the connection is to be made to.
            let areaServerIndex = await general.select.areaServer(backOfficeManagement);
            let accessGateIndex = null;

            if(areaServerIndex != null){

                accessGateIndex = await general.select.accessGate(backOfficeManagement,areaServerIndex);

            }

            console.log('Attempting connection over SSH!');

            //Run function to connect over SSH to the specified system.
            general.connectSSH(backOfficeManagement,areaServerIndex,accessGateIndex);

            console.log('Connection closed!')

            return 0;
        },
        //Function for the selection of a Back Office and all prerequisites.
        system: async function(){

            await this.country();
            await this.owner();
            await this.backOffice();

            return config.baseDirectory + '/countries' + '/\'' + this.input.country + '\'/\'' + this.input.owner + '\'/\'' + this.input.backOffice + '\'';
        }
    },
    //Function to save the configuration from a deployed system to the local machine.
    saveDeployedConfiguration: function (backOfficePath,backOfficeManagement) {
    
        //Organise and save the loaded configuration files to their representative folders.
        let organiseCommands = `
            cp ${config.baseDirectory}/temp/sbo/config.json ${backOfficePath}/config.json
            `;
    
        //Load the configuration of the Back Office.
        let commands =`
            #!/bin/bash
            rm -rf ${config.baseDirectory}/temp/*
            ssh -i ~/.ssh/${config.SSHkey} -p ${backOfficeManagement.sbo.port} entringo@${backOfficeManagement.sbo.ip} /bin/bash <<SBO
            rm -rf /entringo/temp/*
            mkdir /entringo/temp/sbo
            cp /entringo/sbo/config.json /entringo/temp/sbo/
            `;
    
        //Load the configuration of the Area Servers and Access Gates belonging to the Back Office.
        backOfficeManagement.sbo.las.forEach((areaServer,areaServerIndex) => {
    
            organiseCommands = organiseCommands.concat(`
                cp ${config.baseDirectory}/temp/sbo/las${areaServerIndex}/config.json ${backOfficePath}/\'${areaServer.name}\'/config.json
                `);
    
            //Check if Area Server is local to the Back Office.
            if(backOfficeManagement.sbo.ip == areaServer.ip){
                commands = commands.concat(`mkdir /entringo/temp/sbo/las${areaServerIndex}
                    cp /entringo/las/config.json /entringo/temp/sbo/las${areaServerIndex}/
                    `);
    
                //Load the configuration of the Access Gates belonging to the Area Server.
                areaServer.hal.forEach((accessGate,accessGateIndex) => {
                    
                    //Check if Access Gate is local to the Area Server.
                    if(accessGate.ip == areaServer.ip){

                        //Load the configuration of the Access Gate.
                        commands = commands.concat(`mkdir /entringo/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}
                            cp /entringo/hal/config.json /entringo/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}/
                            `);
    
                    }
                    else{

                        //Load the configuration of the Access Gate.
                        commands = commands.concat(`
                            mkdir /entringo/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}
                            scp -i ~/.ssh/las.key -P ${accessGate.port} entringo@${accessGate.ip}:/entringo/hal/config.json /entringo/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}/
                            `);         
                    }
    
                    organiseCommands = organiseCommands.concat(`
                        cp ${config.baseDirectory}/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}/config.json ${backOfficePath}/\'${areaServer.name}\'/\'${accessGate.name}\'/config.json
                        `);
    
                });
            }
            else{

                //Load the configuration of the Area Server.
                commands = commands.concat(`
                    ssh -i ~/.ssh/sbo.key -p ${areaServer.port} entringo@${areaServer.ip} /bin/bash <<LAS${areaServerIndex}
                    rm -rf /entringo/temp/*
                    mkdir /entringo/temp/las${areaServerIndex}
                    cp /entringo/las/config.json /entringo/temp/las${areaServerIndex}/
                    `);
    
                //Load the configuration of the Access Gates belonging to the Area Server.
                areaServer.hal.forEach((accessGate,accessGateIndex) => {
                    
                    //Check if Access Gate is local to the Area Server.
                    if(accessGate.ip == areaServer.ip){

                        //Load the configuration of the Access Gate
                        commands = commands.concat(`
                            mkdir /entringo/temp/las${areaServerIndex}/hal${accessGateIndex}
                            cp /entringo/hal/config.json /entringo/temp/las${areaServerIndex}/hal${accessGateIndex}/
                            `);
    
                    }
                    else{

                        //Load the configuration of the Access Gate.
                        commands = commands.concat(`
                            mkdir /entringo/temp/las${areaServerIndex}/hal${accessGateIndex}
                            scp -i ~/.ssh/las.key -P ${accessGate.port} entringo@${accessGate.ip}:/entringo/hal/config.json /entringo/temp/las${areaServerIndex}/hal${accessGateIndex}/
                            `);         
                    }
    
                    organiseCommands = organiseCommands.concat(`cp ${config.baseDirectory}/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}/config.json ${backOfficePath}/\'${areaServer.name}\'/\'${accessGate.name}\'/config.json
                        `);
    
                });
    
                //Add delimiter
                commands = commands.concat(`
                    LAS${areaServerIndex}
                    scp -r -i ~/.ssh/sbo.key -P ${areaServer.port} entringo@${areaServer.ip}:/entringo/temp/las${areaServerIndex} /entringo/temp/sbo/las${areaServerIndex}/`);
            }
        });
    
        //Add delimiter
        commands = commands.concat(`
            SBO
            scp -r -i ~/.ssh/${config.SSHkey} -P ${backOfficeManagement.sbo.port} entringo@${backOfficeManagement.sbo.ip}:/entringo/temp/sbo ${config.baseDirectory}/temp/sbo
            `);
    
        //Append the organisational commands to the commands which are to be run.
        commands = commands.concat(organiseCommands);
    
        //Cut the indendation
        commands = commands.replace(/(\n)\s+/g, '$1');
    
        terminal.runBash(commands);
    },
    //Function to deploy the configuration stored in the local machine to a system.
    deploySavedConfiguration: function (backOfficePath,backOfficeManagement) {

        //Organise the required configuration files before copying them the the Back Office.
        let organiseCommands = `
            #!/bin/bash
            if [ -d "${config.baseDirectory}/temp" ]; 
            then
                echo 'Removing previous temporary directory contents.'
                rm -r ${config.baseDirectory}/temp/*
            else
                mkdir ${config.baseDirectory}/temp
            fi
            mkdir ${config.baseDirectory}/temp/sbo
            cp ${backOfficePath}/config.json ${config.baseDirectory}/temp/sbo/config.json 
            `;

        //Update the Back Office configuration.
        let commands =`
            scp -r -i ~/.ssh/${config.SSHkey} -P ${backOfficeManagement.sbo.port} ${config.baseDirectory}/temp entringo@${backOfficeManagement.sbo.ip}:/entringo/
            ssh -i ~/.ssh/${config.SSHkey} -p ${backOfficeManagement.sbo.port} entringo@${backOfficeManagement.sbo.ip} /bin/bash <<SBO
            sudo -- bash -c "
            #Stop running service
            systemctl stop sbo

            #Change configuration
            mv -f /entringo/sbo/config.json /entringo/sbo_old/config.json
            cp /entringo/temp/sbo/config.json /entringo/sbo/config.json
            chmod 600 /entringo/sbo/config.json
            chown entringo:entringo /entringo/sbo/config.json

            #Start new service
            systemctl start sbo
            "`;

        //Update the configuration of the Area Servers and Access Gates belonging to the Back Office.
        backOfficeManagement.sbo.las.forEach((areaServer,areaServerIndex) => {

            organiseCommands = organiseCommands.concat(`
                mkdir ${config.baseDirectory}/temp/sbo/las${areaServerIndex}
                cp ${backOfficePath}/\'${areaServer.name}\'/config.json ${config.baseDirectory}/temp/sbo/las${areaServerIndex}/config.json
                `);

            //Check if the Area Server is local to the Back Office.
            if(backOfficeManagement.sbo.ip == areaServer.ip){

                //Update the Area Server configuration.
                commands = commands.concat(`
                    sudo -- bash -c "
                    #Stop running service
                    systemctl stop las
            
                    #Change configuration
                    mv -f /entringo/las/config.json /entringo/las_old/config.json
                    cp /entringo/temp/sbo/las${areaServerIndex}/config.json /entringo/las/config.json
                    chmod 600 /entringo/las/config.json
                    chown entringo:entringo /entringo/las/config.json
            
                    #Start new service
                    systemctl start las
                    "`);

                //Update the configuration of the Access Gates belonging to the Area Server.
                areaServer.hal.forEach((accessGate,accessGateIndex) => {

                    organiseCommands = organiseCommands.concat(`
                        mkdir ${config.baseDirectory}/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}
                        cp ${backOfficePath}/\'${areaServer.name}\'/\'${accessGate.name}\'/config.json ${config.baseDirectory}/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}/config.json
                        `);
                    
                    //Check if the Access Gate is local to the Area Server.
                    if(accessGate.ip == areaServer.ip){

                        //Update the Access Gate configuration.
                        commands = commands.concat(`
                            sudo -- bash -c "
                            #Stop running service
                            systemctl stop hal
                    
                            #Change configuration
                            mv -f /entringo/hal/config.json /entringo/hal_old/config.json
                            cp /entringo/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}/config.json /entringo/hal/config.json
                            chmod 600 /entringo/hal/config.json
                            chown entringo:entringo /entringo/hal/config.json
                    
                            #Start new service
                            systemctl start hal
                            "`);
                    }
                    else{
                        
                        //Update the Access Gate configuration.
                        commands = commands.concat(`
                            scp -i ~/.ssh/las.key -P ${accessGate.port} /entringo/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}/config.json entringo@${accessGate.ip}:/entringo/temp/config.json
                            ssh -i ~/.ssh/las.key -p ${accessGate.port} entringo@${accessGate.ip} /bin/bash <<HAL${accessGateIndex}
                            sudo -- bash -c "
                            #Stop running service
                            systemctl stop hal
                    
                            #Change configuration
                            mv -f /entringo/hal/config.json /entringo/hal_old/config.json
                            cp /entringo/temp/config.json /entringo/hal/config.json
                            chmod 600 /entringo/hal/config.json
                            chown entringo:entringo /entringo/hal/config.json
                    
                            #Start new service
                            systemctl start hal

                            rm -rf /entringo/temp/*
                            "
                            HAL${accessGateIndex}`);         
                    }
                });
            }
            else{

                //Update the Area Server configuration.
                commands = commands.concat(`
                    scp -r -i ~/.ssh/sbo.key -P ${areaServer.port} /entringo/temp/sbo/las${areaServerIndex} entringo@${areaServer.ip}:/entringo/temp/
                    ssh -i ~/.ssh/sbo.key -p ${areaServer.port} entringo@${areaServer.ip} /bin/bash <<LAS${areaServerIndex}
                    sudo -- bash -c "
                    #Stop running service
                    systemctl stop las
            
                    #Change configuration
                    mv -f /entringo/las/config.json /entringo/las_old/config.json
                    cp /entringo/temp/sbo/las${areaServerIndex}/config.json /entringo/las/config.json
                    chmod 600 /entringo/las/config.json
                    chown entringo:entringo /entringo/las/config.json
            
                    #Start new service
                    systemctl start las
                    "`);

                //Update the configuration of the Access Gates belonging to the Area Server.
                areaServer.hal.forEach((accessGate,accessGateIndex) => {

                    organiseCommands = organiseCommands.concat(`
                        mkdir ${config.baseDirectory}/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}
                        cp ${backOfficePath}/\'${areaServer.name}\'/\'${accessGate.name}\'/config.json ${config.baseDirectory}/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}/config.json
                        `);
                    
                    //Check if the Access Gate is local to the Area Server.
                    if(accessGate.ip == areaServer.ip){

                        //Update the Access Gate configuration.
                        commands = commands.concat(`
                            sudo -- bash -c "
                            #Stop running service
                            systemctl stop hal
                    
                            #Change configuration
                            mv -f /entringo/hal/config.json /entringo/hal_old/config.json
                            cp /entringo/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}/config.json /entringo/hal/config.json
                            chmod 600 /entringo/hal/config.json
                            chown entringo:entringo /entringo/hal/config.json
                    
                            #Start new service
                            systemctl start hal
                            "`);
                    }
                    else{

                        //Update the Access Gate configuration.
                        commands = commands.concat(`
                            scp -i ~/.ssh/las.key -P ${accessGate.port} /entringo/temp/las${areaServerIndex}/hal${accessGateIndex}/config.json entringo@${accessGate.ip}:/entringo/temp/config.json
                            ssh -i ~/.ssh/las.key -p ${accessGate.port} entringo@${accessGate.ip} /bin/bash <<HAL${accessGateIndex}
                            sudo -- bash -c "
                            #Stop running service
                            systemctl stop hal
                    
                            #Change configuration
                            mv -f /entringo/hal/config.json /entringo/hal_old/config.json
                            cp /entringo/temp/config.json /entringo/hal/config.json
                            chmod 600 /entringo/hal/config.json
                            chown entringo:entringo /entringo/hal/config.json
                    
                            #Start new service
                            systemctl start hal

                            rm -rf /entringo/temp/*
                            "
                            HAL${accessGateIndex}`);         
                    }
                });

                //Add delimiter
                commands = commands.concat(`
                    rm -rf /entringo/temp/*
                    LAS${areaServerIndex}`);
            }
        });

        //Add delimiter
        commands = commands.concat(`
            rm -rf /entringo/temp/*
            SBO`);

        //Add the organisational commands to be run before the others.
        commands = organiseCommands.concat(commands);

        //Cut the indendation
        commands = commands.replace(/(\n)\s+/g, '$1');

        terminal.runBash(commands);
    },
    //Function to update the system to specified version.
    updateSystem: function (version,backOfficePath,backOfficeManagement) {

        //Organise the required version files before copying them the the Back Office.
        let organiseCommands = `
            #!/bin/bash
            echo 'Organising version files.'

            if [ -d "${config.baseDirectory}/update" ]; 
            then
                echo 'Removing previous update directory contents.'
                rm -r ${config.baseDirectory}/update/*
            else
                mkdir ${config.baseDirectory}/update
            fi

            cp -r ${config.baseDirectory}/versions/${version}/* ${config.baseDirectory}/update/

            if [ -d "${config.baseDirectory}/temp" ]; 
            then
                echo 'Removing previous temporary directory contents.'
                rm -r ${config.baseDirectory}/temp/*
            else
                mkdir ${config.baseDirectory}/temp
            fi

            mkdir ${config.baseDirectory}/temp/sbo
            cp ${backOfficePath}/config.json ${config.baseDirectory}/temp/sbo/config.json 
            `;

        //Update the Back Office.
        let commands =`
            echo 'Moving files to the system Back Office.'
            scp -r -i ~/.ssh/${config.SSHkey} -P ${backOfficeManagement.sbo.port} ${config.baseDirectory}/\{update,temp\} entringo@${backOfficeManagement.sbo.ip}:/entringo/
            ssh -i ~/.ssh/${config.SSHkey} -p ${backOfficeManagement.sbo.port} entringo@${backOfficeManagement.sbo.ip} /bin/bash <<SBO
            echo 'Updating the system Back Office.'
            sudo -- bash -c "
            #Stop running service
            systemctl stop sbo

            #App
            rm -rf /entringo/sbo_old
            mv -f /entringo/sbo /entringo/sbo_old
            cp -rf /entringo/update/sbo /entringo/
            cp -r /entringo/sbo_old/i18n /entringo/sbo/
            cp /entringo/temp/sbo/config.json /entringo/sbo/
            chmod 600 /entringo/sbo/*
            chmod 700 /entringo/sbo/sbo
            chown -R entringo:entringo /entringo/*

            #Start new service
            systemctl start sbo
            "`;

        //Update the Area Servers and Access Gates belonging to the Back Office.
        backOfficeManagement.sbo.las.forEach((areaServer,areaServerIndex) => {

            organiseCommands = organiseCommands.concat(`
                mkdir ${config.baseDirectory}/temp/sbo/las${areaServerIndex}
                cp ${backOfficePath}/\'${areaServer.name}\'/config.json ${config.baseDirectory}/temp/sbo/las${areaServerIndex}/config.json
                `);

            //Check if the Area Server is local to the Back Office.
            if(backOfficeManagement.sbo.ip == areaServer.ip){

                //Update the Area Server.
                commands = commands.concat(`
                    echo 'Updating Area Server ${areaServerIndex}.'
                    sudo -- bash -c "
                    #Stop running service
                    systemctl stop las
            
                    #App
                    rm -rf /entringo/las_old
                    mv -f /entringo/las /entringo/las_old
                    cp -rf /entringo/update/las /entringo/
                    cp /entringo/temp/sbo/las${areaServerIndex}/config.json /entringo/las/
                    chmod 600 /entringo/las/*
                    chmod 700 /entringo/las/las
                    chown -R entringo:entringo /entringo/*
            
                    #Start new service
                    systemctl start las
                    "`);

                //Update the Access Gates belonging to the Area Server.
                areaServer.hal.forEach((accessGate,accessGateIndex) => {

                    organiseCommands = organiseCommands.concat(`
                        mkdir ${config.baseDirectory}/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}
                        cp ${backOfficePath}/\'${areaServer.name}\'/\'${accessGate.name}\'/config.json ${config.baseDirectory}/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}/config.json
                        `);
                    
                    //Check if the Access Gate is local to the Area Server.
                    if(accessGate.ip == areaServer.ip){

                        //Update the Access Gate.
                        commands = commands.concat(`
                            echo 'Updating Access Gate ${accessGateIndex}.'
                            sudo -- bash -c "
                            #Stop running service
                            systemctl stop hal
                    
                            #App
                            rm -rf /entringo/hal_old
                            mv -f /entringo/hal /entringo/hal_old
                            cp -rf /entringo/update/hal /entringo/
                            cp /entringo/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}/config.json /entringo/hal/
                            cp /entringo/hal_old/hal-messages.json /entringo/hal/
                            chmod 600 /entringo/hal/*
                            chmod 700 /entringo/hal/static
                            chmod 700 /entringo/hal/templates
                            chmod 700 /entringo/hal/hal
                            chown -R entringo:entringo /entringo/*
                    
                            #Start new service
                            systemctl start hal
                            "`);
                    }
                    else{
                        
                        //Update the Access Gate.
                        commands = commands.concat(`
                            echo 'Moving files to Access Gate ${accessGateIndex}.'
                            scp -r -i ~/.ssh/las.key -P ${accessGate.port} /entringo/update/hal entringo@${accessGate.ip}:/entringo/update/
                            scp -r -i ~/.ssh/las.key -P ${accessGate.port} /entringo/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}/config.json entringo@${accessGate.ip}:/entringo/update/hal/
                            ssh -i ~/.ssh/las.key -p ${accessGate.port} entringo@${accessGate.ip} /bin/bash <<HAL${accessGateIndex}
                            echo 'Updating Access Gate ${accessGateIndex}.'
                            sudo -- bash -c "
                            #Stop running service
                            systemctl stop hal
                    
                            #App
                            rm -rf /entringo/hal_old
                            mv -f /entringo/hal /entringo/hal_old
                            cp -rf /entringo/update/hal /entringo/
                            cp /entringo/hal_old/hal-messages.json /entringo/hal/
                            chmod 600 /entringo/hal/*
                            chmod 700 /entringo/hal/static
                            chmod 700 /entringo/hal/templates
                            chmod 700 /entringo/hal/hal
                            chown -R entringo:entringo /entringo/*
                    
                            #Start new service
                            systemctl start hal

                            rm -rf /entringo/update/*
                            "
                            HAL${accessGateIndex}`);         
                    }
                });
            }
            else{

                //Update the Area Server.
                commands = commands.concat(`
                    echo 'Moving files to Area Server ${areaServerIndex}.'
                    scp -r -i ~/.ssh/sbo.key -P ${areaServer.port} /entringo/update/\{las,hal\} entringo@${areaServer.ip}:/entringo/update/
                    scp -r -i ~/.ssh/sbo.key -P ${areaServer.port} /entringo/temp/sbo/las${areaServerIndex} entringo@${areaServer.ip}:/entringo/temp/
                    ssh -i ~/.ssh/sbo.key -p ${areaServer.port} entringo@${areaServer.ip} /bin/bash <<LAS${areaServerIndex}
                    echo 'Updating Area Server ${areaServerIndex}.'
                    sudo -- bash -c "
                    #Stop running service
                    systemctl stop las
            
                    #App
                    rm -rf /entringo/las_old
                    mv -f /entringo/las /entringo/las_old
                    cp -rf /entringo/update/las /entringo/
                    cp /entringo/temp/las${areaServerIndex}/config.json /entringo/las/
                    chmod 600 /entringo/las/*
                    chmod 700 /entringo/las/las
                    chown -R entringo:entringo /entringo/*
            
                    #Start new service
                    systemctl start las
                    "`);

                //Update the Access Gates belonging to the Area Server.
                areaServer.hal.forEach((accessGate,accessGateIndex) => {

                    organiseCommands = organiseCommands.concat(`
                        mkdir ${config.baseDirectory}/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}
                        cp ${backOfficePath}/\'${areaServer.name}\'/\'${accessGate.name}\'/config.json ${config.baseDirectory}/temp/sbo/las${areaServerIndex}/hal${accessGateIndex}/config.json
                        `);
                    
                    //Check if the Access Gate is local to the Area Server.
                    if(accessGate.ip == areaServer.ip){

                        //Update the Access Gate.
                        commands = commands.concat(`
                            echo 'Updating Access Gate ${accessGateIndex}.'
                            sudo -- bash -c "
                            #Stop running service
                            systemctl stop hal
                    
                            #App
                            rm -rf /entringo/hal_old
                            mv -f /entringo/hal /entringo/hal_old
                            cp -rf /entringo/update/hal /entringo/
                            cp /entringo/temp/las${areaServerIndex}/hal${accessGateIndex}/config.json /entringo/hal/
                            cp /entringo/hal_old/hal-messages.json /entringo/hal/
                            chmod 600 /entringo/hal/*
                            chmod 700 /entringo/hal/static
                            chmod 700 /entringo/hal/templates
                            chmod 700 /entringo/hal/hal
                            chown -R entringo:entringo /entringo/*
                    
                            #Start new service
                            systemctl start hal
                            "`);
                    }
                    else{

                        //Update the Access Gate.
                        commands = commands.concat(`
                            echo 'Moving files to Access Gate ${accessGateIndex}.'
                            scp -r -i ~/.ssh/las.key -P ${accessGate.port} /entringo/update/hal entringo@${accessGate.ip}:/entringo/update/
                            scp -r -i ~/.ssh/las.key -P ${accessGate.port} /entringo/temp/las${areaServerIndex}/hal${accessGateIndex}/config.json entringo@${accessGate.ip}:/entringo/update/hal/
                            ssh -i ~/.ssh/las.key -p ${accessGate.port} entringo@${accessGate.ip} /bin/bash <<HAL${accessGateIndex}
                            echo 'Updating Access Gate ${accessGateIndex}-'
                            sudo -- bash -c "
                            #Stop running service
                            systemctl stop hal
                    
                            #App
                            rm -rf /entringo/hal_old
                            mv -f /entringo/hal /entringo/hal_old
                            cp -rf /entringo/update/hal /entringo/
                            cp /entringo/hal_old/hal-messages.json /entringo/hal/
                            chmod 600 /entringo/hal/*
                            chmod 700 /entringo/hal/static
                            chmod 700 /entringo/hal/templates
                            chmod 700 /entringo/hal/hal
                            chown -R entringo:entringo /entringo/*
                    
                            #Start new service
                            systemctl start hal

                            rm -rf /entringo/update/*
                            "
                            HAL${accessGateIndex}`);         
                    }
                });

                //Add delimiter
                commands = commands.concat(`
                    rm -rf /entringo/update/*
                    rm -rf /entringo/temp/*
                    LAS${areaServerIndex}`);
            }
        });

        //Add delimiter
        commands = commands.concat(`
            rm -rf /entringo/update/*
            rm -rf /entringo/temp/*
            SBO`);

        //Add the organisational commands to be run before the others.
        commands = organiseCommands.concat(commands);

        //Cut the indendation
        commands = commands.replace(/(\n)\s+/g, '$1');

        terminal.runBash(commands);
    },
    //Function to check version of a deployed system.
    checkVersion: function (backOfficeManagement){

        //Check version of the Back Office.
        let commands =`
            #!/bin/bash
            ssh -i ~/.ssh/${config.SSHkey} -p ${backOfficeManagement.sbo.port} entringo@${backOfficeManagement.sbo.ip} /bin/bash <<SBO
            echo -n 'Certificate expiry: '; openssl x509 -enddate -noout -in /entringo/Entringo-Certificates/EntringoCA.crt |cut -d= -f 2
            echo -n 'Back Office '; /entringo/sbo/sbo --version
            `;
    
        //Check version of Area Servers and Access Gates belonging to the Back Office.
        backOfficeManagement.sbo.las.forEach((areaServer,areaServerIndex) => {
    
            //Check if Area Server is local to the Back Office.
            if(backOfficeManagement.sbo.ip == areaServer.ip){

                //Check version of the Area Server.
                commands = commands.concat(`echo -n 'Area Server ${areaServerIndex} '; /entringo/las/las --version
                    `);
    
                //Check version of Access Gates belonging to the Area Server.
                areaServer.hal.forEach((accessGate,accessGateIndex) => {
                    
                    //Check if Access Gate is local to the Back Office.
                    if(accessGate.ip == areaServer.ip){
                        commands = commands.concat(`echo -n 'Access Gate ${accessGateIndex} '; /entringo/hal/hal --version
                            `);
                    }
                    else{

                        //Check version of Access Gate.
                        commands = commands.concat(`
                            ssh -i ~/.ssh/las.key -p ${accessGate.port} entringo@${accessGate.ip} /bin/bash <<HAL${accessGateIndex}
                            echo -n 'Access Gate ${accessGateIndex} '; /entringo/hal/hal --version
                            HAL${accessGateIndex}`);         
                    }
                });
            }
            else{

                //Check version of the Area Server.
                commands = commands.concat(`
                    ssh -i ~/.ssh/sbo.key -p ${areaServer.port} entringo@${areaServer.ip} /bin/bash <<LAS${areaServerIndex}
                    echo -n 'Area Server ${areaServerIndex} '; /entringo/las/las --version
                    `);
    
                //Check version of Access Gates belonging to the Area Server.
                areaServer.hal.forEach((accessGate,accessGateIndex) => {
                    
                    //Check if Access Gate is local to the Area Server.
                    if(accessGate.ip == areaServer.ip){

                        //Check version of Access Gate.
                        commands = commands.concat(`echo -n 'Access Gate ${accessGateIndex} '; /entringo/hal/hal --version
                            `);
                    }
                    else{

                        //Check version of Access Gate.
                        commands = commands.concat(`
                            ssh -i ~/.ssh/las.key -p ${accessGate.port} entringo@${accessGate.ip} /bin/bash <<HAL${accessGateIndex}
                            echo -n 'Access Gate ${accessGateIndex} '; /entringo/hal/hal --version
                            HAL${accessGateIndex}`);         
                    }
                });
    
                //Add delimiter
                commands = commands.concat(`
                    LAS${areaServerIndex}`);
            }
        });
    
        //Add delimiter
        commands = commands.concat(`
            SBO`);
    
        //Cut the indendation
        commands = commands.replace(/(\n)\s+/g, '$1');
    
        terminal.runBash(commands);
    },
    //Function to connect to a specified system component over SSH.
    connectSSH: function (backOfficeManagement,areaServerIndex,accessGateIndex){

        //Connect to the Back Office.
        let commands =`ssh -tt -i ~/.ssh/${config.SSHkey} -p ${backOfficeManagement.sbo.port} entringo@${backOfficeManagement.sbo.ip} `;
        
        if(areaServerIndex != null){

            //If specified connect to the Area Server from the Back Office.
            commands = commands.concat(`ssh -tt -i ~/.ssh/sbo.key -p ${backOfficeManagement.sbo.las[areaServerIndex].port} entringo@${backOfficeManagement.sbo.las[areaServerIndex].ip}`);
        
            if(accessGateIndex != null){
                //If specified connect to the Access Gate from the Area Server.
                commands = commands.concat(`ssh -tt -i ~/.ssh/las.key -p ${backOfficeManagement.sbo.las[areaServerIndex].hal[accessGateIndex].port} entringo@${backOfficeManagement.sbo.las[areaServerIndex].hal[accessGateIndex].ip}`);
            }
        }
        
        //Cut the indendation
        //commands = commands.replace(/(\n)\s+/g, '$1');
    
        terminal.runBash(commands);
    }
}

//Terminal function to run commands.
var terminal = {
    runBash: function(commands) {

        //Function to execute bash commands, or log them for debugging.
        if(config.DEBUG){
            console.log(commands);
        }
        else{
            shell.exec(commands,{shell: '/bin/bash'});
        }
    }
}

//Main menu function, for the selection of management actions.
function mainMenu(){

    //Prompt the user for action input.
    return inquirer.prompt([
        {
            type: 'list',
            prefix: '',
            name: 'action',
            message: 'What would you like to do?',
            choices: ['Create new system','Deploy new system', 'Update existing system','Save configuration files from an existing system','Deploy saved configuration files to an existing system', 'Check version of an existing system', 'Connect to a device over SSH', 'Exit']
        }
    ]).then((answer) => {

        switch(answer.action){

            case 'Create new system': {

                //Run function for rew system creation.
                return newSystem.create.new()
                .then(() => {

                    inquirer.prompt([
                        {
                            type: 'confirm',
                            prefix: '',
                            name: 'confirmation',
                            message: 'Would you like to deploy the system you just created?'
                        }
                    ]).then((answer) => {

                        if(answer.confirmation){

                            //Run function for system deployment.
                            deploySystem.all(config.baseDirectory + '/countries' + '/\'' + newSystem.input.configuration.country + '\'/\'' + newSystem.input.configuration.owner + '\'/\'' + newSystem.input.configuration.sbo.name + '\'');
                        }
                        else{
                            return mainMenu();
                        }
                    });
                });

                break;
            }
            case'Deploy new system': {

                //Run function for system deployment.
                return deploySystem.all()
                .then(() => {

                    return mainMenu();
                });

                break;
            }
            case 'Update existing system': {

                //Run function for system selection.
                return general.select.system()
                .then((backOfficePath) => {

                    let backOfficeManagement = JSON.parse(fs.readFileSync(backOfficePath.replace(/'/g, '')+'/management.json'));

                    //Check if the system is deployed.
                    if(backOfficeManagement.deployed == true){
                        throw('The selected system has not been deployed!');
                    }

                    //Run function for version selection.
                    return general.select.version()
                    .then((version) => {

                        //Run function for system update.
                        general.updateSystem(version,backOfficePath,backOfficeManagement)
                        
                        console.log('System version update completed!')
                        return mainMenu();
                        
                    });
                })
                .catch((errors) => {
                    console.log('Error(s) occured!');
                    console.log(errors);

                    return mainMenu();
                });

                break;
            }
            case 'Check version of an existing system': {

                //Run function for system selection.
                return general.select.system()
                .then((backOfficePath) => {

                    let backOfficeManagement = JSON.parse(fs.readFileSync(backOfficePath.replace(/'/g, '')+'/management.json'));

                    //Check if the system is deployed.
                    if(backOfficeManagement.deployed == true){
                        throw('The selected system has not been deployed!');
                    }

                    //Run function to check system version.
                    general.checkVersion(backOfficeManagement);
                    
                    console.log('System version check completed!')
                    return mainMenu();
                    
                })
                .catch((errors) => {
                    console.log('Error(s) occured!');
                    console.log(errors);

                    return mainMenu();
                });

                break;
            }
            case 'Save configuration files from an existing system': {

                //Run function for system selection.
                return general.select.system()
                .then((backOfficePath) => {

                    let backOfficeManagement = JSON.parse(fs.readFileSync(backOfficePath.replace(/'/g, '')+'/management.json'));

                    //Check if the system is deployed.
                    if(backOfficeManagement.deployed == true){
                        throw('The selected system has not been deployed!');
                    }

                    //Run function to save system configuration files.
                    general.saveDeployedConfiguration(backOfficePath,backOfficeManagement)
                
                    console.log('Configuration files saved!')
                    return mainMenu();
                    
                })
                .catch((errors) => {
                    console.log('Error(s) occured!');
                    console.log(errors);

                    return mainMenu();
                });

                break;
            }
            case 'Deploy saved configuration files to an existing system': {

                //Run function for system selection.
                return general.select.system()
                .then((backOfficePath) => {

                    let backOfficeManagement = JSON.parse(fs.readFileSync(backOfficePath.replace(/'/g, '')+'/management.json'));

                    //Check if the system is deployed.
                    if(backOfficeManagement.deployed == true){
                        throw('The selected system has not been deployed!');
                    }

                    //Run function to deploy system configuration files.
                    general.deploySavedConfiguration(backOfficePath,backOfficeManagement)
                    
                    console.log('Configuration files deployed!')
                    return mainMenu();
                    
                })
                .catch((errors) => {
                    console.log('Error(s) occured!');
                    console.log(errors);

                    return mainMenu();
                });

                break;
            }
            case 'Connect to a device over SSH':{

                //Run the function for SSH connection selection and creation.
                return general.select.SSH();
                
                break;
            }
            default: {

                //Exit.
                process.exit(0);
            }
        }
    })
    .catch((errors) => {
        console.log('Error(s) occured!');
        console.log(errors);

        return mainMenu();
    });
}

//Run the main menu.
console.log('Welcome to the Entringo management tool!');
mainMenu();
