// generated on 2021-02-07 using generator-webapp 4.0.0-7
const { src, dest, watch, series, parallel, lastRun } = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const browserSync = require('browser-sync');
const del = require('del');
const autoprefixer = require('autoprefixer');
const Fiber = require('fibers');
const cssDeclarationSorter = require('css-declaration-sorter');
const sortMedia = require('postcss-sort-media-queries');
const cssnano = require('cssnano');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const named = require('vinyl-named');
const { argv } = require('yargs');
const WebpackConfig = require('./webpack.config');

const $ = gulpLoadPlugins();
const server = browserSync.create();

const port = argv.port || 9000;

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
const isDev = !isProd && !isTest;

function styles() {
	return src('app/styles/main.scss')
		.pipe($.plumber())
		.pipe($.if(!isProd, $.sourcemaps.init()))
		.pipe(
			$.sass
				.sync({
					fiber: Fiber,
					outputStyle: 'expanded',
					precision: 10,
					includePaths: ['.'],
				})
				.on('error', $.sass.logError)
		)
		.pipe(
			$.if(
				isProd,
				$.postcss([
					sortMedia(),
					autoprefixer(),
					cssDeclarationSorter({
						order: 'concentric-css',
					}),
					cssnano()
				])
			)
		)
		.pipe($.if(!isProd, $.sourcemaps.write()))
		.pipe($.if(!isProd, dest('.tmp/styles')))
		.pipe($.if(isProd, dest('dist/styles')))
		.pipe(server.reload({ stream: true }));
}

function scripts() {
	return src('app/scripts/main.js')
		.pipe($.plumber())
		.pipe(named())
		.pipe(webpackStream(WebpackConfig), webpack)
		.pipe($.if(!isProd, dest('.tmp/scripts')))
		.pipe($.if(isProd, dest('dist/scripts')))
		.pipe(server.reload({ stream: true }));
}

const lintBase = (files) => {
	return src(files)
		.pipe($.eslint({ fix: true }))
		.pipe(server.reload({ stream: true, once: true }))
		.pipe($.eslint.format())
		.pipe($.if(!server.active, $.eslint.failAfterError()));
};
function lint() {
	return lintBase('app/scripts/**/*.js').pipe(dest('app/scripts'));
}
function lintTest() {
	return lintBase('test/spec/**/*.js').pipe(dest('test/spec'));
}

function html() {
	return src('app/*.html')
		.pipe($.useref({ searchPath: ['.tmp', 'app', '.'] }))
		.pipe($.if(/\.js$/, $.uglify({ compress: { drop_console: true } })))
		.pipe(
			$.if(
				/\.css$/,
				$.postcss([cssnano({ safe: true, autoprefixer: false })])
			)
		)
		.pipe(
			$.if(
				/\.html$/,
				$.htmlmin({
					collapseWhitespace: true,
					minifyCSS: true,
					minifyJS: { compress: { drop_console: true } },
					processConditionalComments: true,
					removeComments: true,
					removeEmptyAttributes: true,
					removeScriptTypeAttributes: true,
					removeStyleLinkTypeAttributes: true,
				})
			)
		)
		.pipe(dest('dist'));
}

function images() {
	return src('app/images/**/*', { since: lastRun(images) })
		.pipe($.imagemin())
		.pipe(dest('dist/images'));
}

function fonts() {
	return src('app/fonts/**/*.{eot,svg,ttf,woff,woff2}').pipe(
		$.if(!isProd, dest('.tmp/fonts'), dest('dist/fonts'))
	);
}

function jsonData() {
	return src('app/data/**/*.json').pipe(
		$.if(!isProd, dest('.tmp/data'), dest('dist/data'))
	);
}

function extras() {
	return src(['app/*', '!app/*.html'], {
		dot: true,
	}).pipe(dest('dist'));
}

function clean() {
	return del(['.tmp', 'dist']);
}

function measureSize() {
	return src('dist/**/*').pipe($.size({ title: 'build', gzip: true }));
}

const build = series(
	clean,
	parallel(
		lint,
		series(parallel(styles, scripts), html),
		images,
		fonts,
		jsonData,
		extras
	),
	measureSize
);

function startAppServer() {
	server.init({
		notify: false,
		port,
		server: {
			baseDir: ['.tmp', 'app'],
			routes: {
				'/node_modules': 'node_modules',
			},
		},
	});

	watch(['app/*.html', 'app/images/**/*', '.tmp/fonts/**/*']).on(
		'change',
		server.reload
	);

	watch('app/styles/**/*.scss', styles);
	watch('app/scripts/**/*.js', scripts);
	watch('app/fonts/**/*', fonts);
	watch('app/data/**/*', jsonData);
}

function startTestServer() {
	server.init({
		notify: false,
		port,
		ui: false,
		server: {
			baseDir: 'test',
			routes: {
				'/scripts': '.tmp/scripts',
				'/node_modules': 'node_modules',
			},
		},
	});

	watch('app/scripts/**/*.js', scripts);
	watch(['test/spec/**/*.js', 'test/index.html']).on('change', server.reload);
	watch('test/spec/**/*.js', lintTest);
}

function startDistServer() {
	server.init({
		notify: false,
		port,
		server: {
			baseDir: 'dist',
			routes: {
				'/node_modules': 'node_modules',
			},
		},
	});
}

let serve;
if (isDev) {
	serve = series(
		clean,
		parallel(styles, scripts, fonts, jsonData),
		startAppServer
	);
} else if (isTest) {
	serve = series(clean, scripts, startTestServer);
} else if (isProd) {
	serve = series(build, startDistServer);
}

exports.serve = serve;
exports.build = build;
exports.default = build;
