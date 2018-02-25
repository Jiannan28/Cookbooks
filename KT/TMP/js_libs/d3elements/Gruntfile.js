/* global module */
module.exports = function (grunt) {
    "use strict";
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        banner: '/*!\n' +
                ' * <%= pkg.title %> v<%= pkg.version %> (<%= pkg.homepage %>)\n' +
                ' * Copyright 2014-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
                ' * Licensed under <%= pkg.license.type %> (<%= pkg.license.url %>)\n' +
                ' */\n',
        jshint: {
            files: ['src/*'],
            options:
                { // see http://jshint.com/docs/options/
                    //"asi"      : true,
                    "browser"  : true,
                    "eqeqeq"   : true,
                    "eqnull"   : true,
                    "es3"      : true,
                    //"expr"     : true,
                    //"jquery"   : true,
                    "lastsemic": true,
                    "latedef"  : true,
                    "nonbsp"   : true,
                    "strict"   : true,
                    "undef"    : true,
                    "unused"   : true
                }            
        },
        concat: {
            options: {
                banner: '<%= banner %>\n',
                stripBanners: false
            },
            // css: {
            //     src: [
            //         'style.css'
            //     ],
            //     dest: 'dist/all.css'
            // },
            js: {
                src: [
                    '<%= jshint.files %>'
                ],
                dest: 'dist/d3elements.js'
            }
        },
        // cssmin: {
        //     css: {
        //         src: 'dist/all.css',
        //         dest: 'dist/all.min.css'
        //     }
        // },
        uglify: {
            options: {
                preserveComments: 'some'
            },
            js: {
                files: {
                    'dist/d3elements.min.js': ['dist/d3elements.js']
                }
            }
        },
        watch: {
            files: ['<%= jshint.files %>'],
            tasks: ['concat', 'cssmin', 'uglify']
       }    
    });
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.registerTask('default', ['jshint', 'concat:js', 'uglify:js']); // 'concat:css', 'cssmin:css',
};