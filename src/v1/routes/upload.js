/**
 * Users routes
 */

const express = require('express');
const uuid = require('uuid/v1');
const fs = require('fs');
const multer = require('multer');
const utils = require('./../shared/utils');
const router = express.Router();

const uploadsFolder = (__dirname + '/../../../uploads');
const maximumFileNameLength = 125;

const storage = multer.diskStorage({
    destination: function (req, file, done) {
        let createdFolder = uploadsFolder + `/` + uuid();
        if (!fs.existsSync(createdFolder)){
            fs.mkdirSync(createdFolder);
        }

        done(null, createdFolder);
    },
    filename: function (req, file, done) {
        let filename = `file`;
        if (file.originalname) {
            if (file.originalname.length > maximumFileNameLength) {
                let extension = (file.originalname.indexOf(`.`) > -1 ? file.originalname.split(`.`).pop() : ``);
                filename = file.originalname.substring(1, maximumFileNameLength) + (extension === `` ? `` : `.` + extension);
            } else {
                filename = file.originalname;
            }
        }

        done(null, filename);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 1024 * 1024 * 10
    }
}).single(`file`);

router.use(utils.protectedRouteCheck);

router.post(`/upload`, function (req, res) {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            utils.handleError(res, err);
        } else if (err) {
            utils.handleError(res, err);
        } else {
            res.send({
                url: req.file.path.substring(req.file.path.lastIndexOf(`uploads/`) + 8)
            });
        }
    });
});

module.exports = router;