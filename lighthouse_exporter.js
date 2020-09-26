#!/usr/bin/env node

'use strict';

const http = require('http');
const url = require('url');
const puppeteer = require('puppeteer');
const configLighthouse_desktop = require('/usr/src/app/lighthouse_config_desktop.js');
const configLighthouse_mobile = require('/usr/src/app/lighthouse_config_mobile.js');
const lighthouse = require('lighthouse');
const minimist = require('minimist');
const Mutex = require('async-mutex').Mutex;

var argv = minimist(process.argv.slice(2));


var port = 9593;

if('p' in argv){
    port = argv.p;
}

const mutex = new Mutex();
console.log("WAITING FOR REQUEST");
http.createServer(async (req, res) => {

    const release = await mutex.acquire();

    var q = url.parse(req.url, true);

    if(q.pathname == '/probe'){
        var target = q.query.target;
        const urlTarget = new URL(q.query.target);
        var data = [];
        var start = Date.now();
        console.log("STARTING:"+target);

        try{
            const browser = await puppeteer.launch({executablePath: '/opt/google/chrome-unstable/chrome' ,args: ['--no-sandbox', '--disable-setuid-sandbox']});

            data.push('# HELP lighthouse_exporter_info Exporter Info');
            data.push('# TYPE lighthouse_exporter_info gauge');
            data.push(`lighthouse_exporter_info{version="0.0.1",chrome_version="${await browser.version()}",node_version="${process.version}"} 1`);

            await lighthouse(target, {port: url.parse(browser.wsEndpoint()).port,output: 'json'},configLighthouse_desktop).then(results => {
                    data.push('# HELP lighthouse_score The Score per Category');
                    data.push('# TYPE lighthouse_score gauge');

                    for(var category in results.lhr.categories) {
                       var item = results.lhr.categories[category];
                       data.push(`pagespeed_lighthouse_category_score{category="${category}",host="${urlTarget.protocol}//${urlTarget.host}",path="${urlTarget.pathname}",strategy="desktop",performance_source="lighthouse"} ${item.score}`);
                    }

                    var audits = results.lhr.audits;

                    data.push('# HELP lighthouse_timings Audit timings in secs');
                    data.push('# TYPE lighthouse_timings gauge');
                    data.push(`pagespeed_lighthouse_first_contentful_paint_duration_seconds{host="${urlTarget.protocol}//${urlTarget.host}",path="${urlTarget.pathname}",strategy="desktop",performance_source="lighthouse"} ${audits["first-contentful-paint"].numericValue / 1000}`);
                    data.push(`pagespeed_lighthouse_speed_index_duration_seconds{host="${urlTarget.protocol}//${urlTarget.host}",path="${urlTarget.pathname}",strategy="desktop",performance_source="lighthouse"} ${audits["speed-index"].numericValue /1000}`);
                    data.push(`pagespeed_loading_experience_metrics_largest_contentful_paint_duration_seconds{host="${urlTarget.protocol}//${urlTarget.host}",path="${urlTarget.pathname}",strategy="desktop",performance_source="lighthouse"} ${audits["largest-contentful-paint"].numericValue / 1000}`);
                    data.push(`pagespeed_lighthouse_interactive_duration_seconds{host="${urlTarget.protocol}//${urlTarget.host}",path="${urlTarget.pathname}",strategy="desktop",source="lighthouse"} ${audits["interactive"].numericValue / 1000}`);
                    data.push(`pagespeed_lighthouse_audit_score{audit="total-blocking-time",host="${urlTarget.protocol}//${urlTarget.host}",path="${urlTarget.pathname}",strategy="desktop",performance_source="lighthouse"} ${audits["total-blocking-time"].numericValue / 1000}`);
                    data.push(`pagespeed_lighthouse_audit_score{audit="cumulative-layout-shift",host="${urlTarget.protocol}//${urlTarget.host}",path="${urlTarget.pathname}",strategy="desktop",performance_source="lighthouse"} ${audits["cumulative-layout-shift"].numericValue}`);
                  })
                  .catch(error => {
                      console.error("Lighthouse", Date(), error);
                  });

              await browser.close();

              //Mobile
              const browser2 = await puppeteer.launch({executablePath: '/opt/google/chrome-unstable/chrome' ,args: ['--no-sandbox', '--disable-setuid-sandbox']});

              data.push('# HELP lighthouse_exporter_info Exporter Info');
              data.push('# TYPE lighthouse_exporter_info gauge');
              data.push(`lighthouse_exporter_info{version="0.2.6",chrome_version="${await browser2.version()}",node_version="${process.version}"} 1`);

              await lighthouse(target, {port: url.parse(browser2.wsEndpoint()).port,output: 'json'},configLighthouse_mobile).then(results => {
                      data.push('# HELP lighthouse_score The Score per Category');
                      data.push('# TYPE lighthouse_score gauge');

                      for(var category in results.lhr.categories) {
                         var item = results.lhr.categories[category];
                         data.push(`pagespeed_lighthouse_category_score{category="${category}",host="${urlTarget.protocol}//${urlTarget.host}",path="${urlTarget.pathname}",strategy="mobile",performance_source="lighthouse"} ${item.score}`);
                      }

                      var audits = results.lhr.audits;

                      data.push('# HELP lighthouse_timings Audit timings in secs');
                      data.push('# TYPE lighthouse_timings gauge');
                      data.push(`pagespeed_lighthouse_first_contentful_paint_duration_seconds{host="${urlTarget.protocol}//${urlTarget.host}",path="${urlTarget.pathname}",strategy="mobile",performance_source="lighthouse"} ${audits["first-contentful-paint"].numericValue / 1000}`);
                      data.push(`pagespeed_lighthouse_speed_index_duration_seconds{host="${urlTarget.protocol}//${urlTarget.host}",path="${urlTarget.pathname}",strategy="mobile",performance_source="lighthouse"} ${audits["speed-index"].numericValue /1000}`);
                      data.push(`pagespeed_loading_experience_metrics_largest_contentful_paint_duration_seconds{host="${urlTarget.protocol}//${urlTarget.host}",path="${urlTarget.pathname}",strategy="mobile",performance_source="lighthouse"} ${audits["largest-contentful-paint"].numericValue / 1000}`);
                      data.push(`pagespeed_lighthouse_interactive_duration_seconds{host="${urlTarget.protocol}//${urlTarget.host}",path="${urlTarget.pathname}",strategy="mobile",performance_source="lighthouse"} ${audits["interactive"].numericValue / 1000}`);
                      data.push(`pagespeed_lighthouse_audit_score{audit="total-blocking-time",host="${urlTarget.protocol}//${urlTarget.host}",path="${urlTarget.pathname}",strategy="mobile",performance_source="lighthouse"} ${audits["total-blocking-time"].numericValue / 1000}`);
                      data.push(`pagespeed_lighthouse_audit_score{audit="cumulative-layout-shift",host="${urlTarget.protocol}//${urlTarget.host}",path="${urlTarget.pathname}",strategy="mobile",performance_source="lighthouse"} ${audits["cumulative-layout-shift"].numericValue}`);
                  })
                  .catch(error => {
                      console.error("Lighthouse", Date(), error);
                  });

              await browser2.close();



                      } catch(error) {
                          console.error("Generic", Date(), error);
                      }

                      res.writeHead(200, {"Content-Type": "text/plain"});
                      res.write(data.join("\n"));
                  } else{
                      res.writeHead(404);
                  }

                  release();

                  res.end();
                  var  finish = Date.now();
                  var  timespent = (finish - start) / 1000;
                  console.log("FINISHED:"+target);
                  console.log("TIME SPENT:"+target+":"+timespent);
                  console.log("WAITING FOR REQUEST");
}).listen(port);
