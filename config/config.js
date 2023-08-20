const config = {
    // REST API prefix
    apiPrefix: `/api/v1`,
    // Default SELECT limit
    defaultSelectLimit: 20,
    // Maximum SELECT limit
    maximumSelectLimit: 1000,
    // Payment methods
    paymentMethods: [`In store - Cash`, `In store - Stripe`, `In store - Amex`, `In store - Visa/MasterCard`, `In store - Union Pay`, `In store - PayPal `, `Website - Stripe`, `Website - PayPal`,
        `invoice`, `cash`, `credit`, `webdirect`, `stripe`, `paypal`, `jotform`],
    // System time zone
    systemTimeZone: `+00:00`,
    // Application time zone
    applicationTimeZone: `+10:00`,
};

module.exports = config;