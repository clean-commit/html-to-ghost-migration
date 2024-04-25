import fs from 'fs';
import { readFile } from 'fs/promises';
import { glob } from 'glob';
import * as cheerio from 'cheerio';
import { htmlToLexical } from '@tryghost/kg-html-to-lexical';

init();

async function init() {
  const jsonObject = {
    meta: {
      exported_on: Date.now(),
      version: '2.14.0',
    },
    data: {
      posts: [],
    },
  };

  console.log('Starting migration...');

  const files = await glob('src/**/*.html');
  if (files.length === 0) {
    console.log('No files found');
    return;
  }

  console.log('working on files: ', files.length);
  for (const file of files) {
    const htmlContent = await readFile(file, 'utf-8');
    const $ = cheerio.load(htmlContent);

    const title = $('h1.page-header__title').text().trim();
    const meta_title = $('meta[name="og:title"]').attr('content') || title;
    const meta_description =
      $('meta[name="description"]').attr('content') || null;
    console.log('title: ', title);

    const parentContainer = $('span#hs_cos_wrapper_post_body');

    let featureImage = null;
    let featureImageAlt = null;
    const firstP = $('span#hs_cos_wrapper_post_body p').first();
    if (firstP.find('img').length) {
      featureImage = firstP.find('img').attr('src');
      featureImageAlt = firstP.find('img').attr('alt');
      firstP.remove();
    }

    $('span#hs_cos_wrapper_post_body p:has(span.hs-cta-wrapper)').remove();

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

    // Now create the postContent variable
    let postContent = parentContainer.html();

    // Convert the post content to Lexical format
    const lexical = htmlToLexical(postContent);

    const authorData = $('#hubspot-author_data').text();
    const dateRegex = /\d{2}-\w{3}-\d{4} \d{2}:\d{2}:\d{2}/;
    const dateStr = authorData.match(dateRegex)?.[0];

    // Convert the date string to epoch time
    const published_at = dateStr ? Date.parse(dateStr) : null;

    // Create a new object in the data.posts array
    jsonObject.data.posts.push({
      title,
      lexical,
      feature_image: featureImage,
      feature_image_alt: featureImageAlt,
      feature_image_caption: null,
      featured: 0,
      page: 0,
      status: 'published',
      published_at: published_at || Date.now(),
      published_by: 1,
      email_only: false,
      author_id: 1,
      created_by: 1,
      updated_by: 1,
      meta_title,
      meta_description,
      updated_at: published_at || Date.now(),
      created_at: published_at || Date.now(),
    });
  }

  const migrationName = `migration-${Date.now()}`;

  fs.writeFileSync(
    `${migrationName}.json`,
    JSON.stringify(jsonObject, null, 2),
  );
  console.log(`Migration created: ${migrationName}`);
}
