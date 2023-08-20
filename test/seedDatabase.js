require('dotenv').config();

const seedDatabase = () => {
    return new Promise((resolve, reject) => {
        const conf = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            onerror: err => console.log(err.message)
        };

        require('mysql-import').config(conf).import('./test/e2e/data/bonzabikes_02-12-2019.sql').then(()=> {
            console.log(`Initial data was imported`);
            require('mysql-import').config(conf).import('./test/e2e/data/bonzabikes_changes-0001.sql').then(()=> {
                console.log(`0001 data was imported`);
                require('mysql-import').config(conf).import('./test/e2e/data/bonzabikes_changes-0002.sql').then(()=> {
                    console.log(`0002 data was imported`);
                    require('mysql-import').config(conf).import('./test/e2e/data/bonzabikes_changes-0003.sql').then(()=> {
                        console.log(`0003 data was imported`);
                        require('mysql-import').config(conf).import('./test/e2e/data/bonzabikes_changes-0004.sql').then(()=> {
                            console.log(`0004 data was imported`);
                            resolve();
                        });
                    });
                });
            });
        }).catch(reject);
    });
};

module.exports = seedDatabase;