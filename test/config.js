require('dotenv').config();

const config = {
    host: process.env.TEST_URL + `api/v1/`,
    userLogin: `alexander.shumilov@toptal.com`,
    userPassword: `Welcome.2019`,
    emails: {
        // http://webmail.1gb.ru/?a=w6GMDlquZ3Jalro6nB1%2FogfCOt0T7otk&b=3c770a&webmail=2
        system: {
            email: `bonzabiketours.testing.system@alexshumilov.ru`,
            imap: `pop3-20.1gb.ru`,
            smtp: `smtp-20.1gb.ru`,
            port: 465,
            user: `u497080`,
            password: `648415ba2wrt`
        },
        // http://webmail.1gb.ru/?a=g7k%2BatnSTe8KUfHdtlDKqK3xav9H0LmX&b=f328fd&webmail=2
        client1: {
            email: `bonzabiketours.testing.client1@alexshumilov.ru`,
            imap: `pop3-20.1gb.ru`,
            smtp: `smtp-20.1gb.ru`,
            port: 25,
            user: `u497081`,
            password: `3f2b1035yui`
        },
    }
};

module.exports = config;