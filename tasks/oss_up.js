/*
 * grunt-oss-up
 * https://github.com/marshalYuan/grun-oss-up
 *
 * Copyright (c) 2014 marshalYuan
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

	// Please see the Grunt documentation for more information regarding task
	// creation: http://gruntjs.com/creating-tasks
	var OSS = require('ali-sdk').oss,
		async = require('async'),
		path = require('path'),
		fs = require('fs'),
        co = require('co'),
		chalk = require('chalk');

	grunt.registerMultiTask('oss', 'A grunt tool for uploading static file to aliyun oss.', function() {
		var done = this.async();
		// Merge task-specific and/or target-specific options with these defaults.
		var options = this.options({
			/**
             * @name objectGen --return a aliyun oss object name
			 *					  default return grunt task files' dest + files' name
             * @param dest  --grunt task files' dest
             * @param src  --grunt task files' src
             */
			objectGen: function(dest, src){
				return [dest, path.basename(src)].join('\/');
			}
		});

		if(!options.accessKeyId || !options.accessKeySecret || !options.bucket || !options.region){
			grunt.fail.fatal('accessKeyId, accessKeySecret, bucket and region are all required!');
		}
		//creat a new oss-client
		var	oss = new OSS({
			accessKeyId: options.accessKeyId,
			accessKeySecret: options.accessKeySecret,
            bucket: options.bucket,
            region: options.region
		}),
			uploadQue = [];
		// Iterate over all specified file groups.
		this.files.forEach(function(f) {
			// Concat specified files.
			var objects = f.src.filter(function(filepath) {
				// Warn on and remove invalid source files (if nonull was set).
				if (!grunt.file.exists(filepath)) {
					grunt.log.warn('Source file "' + filepath + '" not found.');
					return false;
				} else {
					return true;
				}
			}).map(function(filepath) {
				// return an oss object.
				var o = {
					object: options.objectGen(f.dest, filepath),
					srcFile: filepath,
                    options: {}
				};
                if(options.mime){
                    o.options.mime = options.mime;
                }
                if(options.meta){
                    o.options.meta = options.meta;
                }
                if(options.headers){
                    o.options.headers = options.headers;
                }
			});
			objects.forEach(function(o) {
				uploadQue.push(o);
			});
		});
		var uploadTasks = [];
		uploadQue.forEach(function(o) {
			uploadTasks.push(makeUploadTask(o));
		});
		grunt.log.ok('Start uploading files.');
		async.series(uploadTasks, function(error, results) {
			if (error) {
				grunt.fail.fatal("uploadError:"+ JSON.stringify(error));
			} else {
				grunt.log.ok('All files has uploaded yet!');
			}
			done(error, results);
		});
		/**
		 * @name makeUploadTask  -- make task for async
		 * @param object  --aliyun oss object
		 */
		function makeUploadTask(o) {
			return function(callback) {
				//skip object when object's path is a directory;
				if( fs.lstatSync(o.srcFile).isDirectory() ){
					grunt.log.error(chalk.cyan(o.srcFile) + chalk.red(' is a directory, skip it!'));
					callback();
				}else {
					grunt.log.ok('Start uploading file '+ chalk.cyan(o.srcFile));
                    co(oss.put(o.object, o.srcFile, {}))
                    .then(function(result){
                        callback(null, result);
                    })
                    .catch(function(e){
                        callback(e);
                    });
				}
			};
		}
	});
};
