import fs from 'fs';
import { readFile } from 'fs/promises';
import { glob } from 'glob';
import * as cheerio from 'cheerio';
import { htmlToLexical } from '@tryghost/kg-html-to-lexical';
import {
  checkIfImageExists,
  initiateProgressBar,
  recursivelyRemoveEmptyElements,
} from './lib/utils.mjs';

const titleElement = 'h1.page-header__title';

init();

async function init() {
  const jsonObject = {
    db: [
      {
        meta: {
          exported_on: Date.now(),
          version: '2.14.0',
        },
        data: {
          posts: [],
        },
      },
    ],
  };

  const files = await glob('src/**/*.html');
  if (files.length === 0) {
    console.log('No files found. Exiting.');
    return;
  }

  const bar = initiateProgressBar();
  bar.start(files.length, 0);
  for (let x = 0; x < files.length; x++) {
    const file = files[x];
    const htmlContent = await readFile(file, 'utf-8');
    const $ = cheerio.load(htmlContent.replaceAll('http://', 'https://'));

    // Get the title & meta data
    const title = $(titleElement).text().trim();
    bar.update(x + 1, { title: `Migrating: ${title}` });
    const meta_title = $('meta[name="og:title"]').attr('content') || title;
    const meta_description =
      $('meta[name="description"]').attr('content') || null;

    // Prepare the date
    const authorData = $('#hubspot-author_data').text();
    const dateRegex = /\d{2}-\w{3}-\d{4} \d{2}:\d{2}:\d{2}/;
    // const dateRegex =
    //   /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2},\s\d{4}\s\d{1,2}:\d{2}:\d{2}\s(AM|PM)\b/;
    const dateStr = authorData.match(dateRegex)?.[0];
    const published_at = dateStr ? new Date(Date.parse(dateStr)) : new Date();

    const parentContainer = $('span#hs_cos_wrapper_post_body');

    // Featured image
    let featureImage = null;
    let featureImageAlt = null;
    const firstP = $('span#hs_cos_wrapper_post_body p').first();
    if (firstP.find('img').length) {
      const imgSrc = firstP.find('img').attr('src');
      if (await checkIfImageExists(imgSrc)) {
        featureImage = imgSrc;
        featureImageAlt = firstP.find('img').attr('alt');
      }
      firstP.remove();
    }

    // Find the index of the element that contains the text
    const targetIndex = parentContainer
      .children()
      .toArray()
      .findIndex((child) => {
        return $(child).text().includes('Andrew Wiseman, Wiseman Lawyers');
      });

    // Remove all elements after the target index
    if (targetIndex !== -1) {
      parentContainer
        .children()
        .toArray()
        .slice(targetIndex + 1)
        .forEach((child) => {
          $(child).remove();
        });
    }

    $('.hs-cta-wrapper').parent().remove();
    $('p:empty, span:empty').each(function () {
      recursivelyRemoveEmptyElements($(this));
    });

    // Sanatize iframes
    $('iframe').each((i, elem) => {
      // Get the outer HTML of the iframe
      const iframeHtml = $.html(elem);

      // Wrap the iframe in an HTML card
      const cardHtml = `<!--kg-card-begin: html-->\n${iframeHtml}\n<!--kg-card-end: html-->`;

      // Replace the iframe with the card
      $(elem).replaceWith(cardHtml);
    });

    // Now create the postContent variable
    let postContent = parentContainer.html();

    const lexical = htmlToLexical(postContent);

    const post = {
      title,
      html: postContent,
      lexical: JSON.stringify(lexical),
      feature_image: featureImage,
      feature_image_alt: featureImageAlt,
      feature_image_caption: null,
      featured: false,
      page: 0,
      status: 'published',
      published_by: 1,
      email_only: false,
      author_id: 1,
      created_by: 1,
      updated_by: 1,
      meta_title,
      meta_description,
      published_at: published_at.toISOString(),
      created_at: new Date().toISOString(),
    };
    // Create a new object in the data.posts array
    jsonObject.db[0].data.posts.push(post);
  }

  const migrationName = `migration-${Date.now()}`;

  fs.writeFileSync(
    `output/${migrationName}.json`,
    JSON.stringify(jsonObject, null, 2),
  );
  console.log(`\nMigration created: ${migrationName}`);
}
