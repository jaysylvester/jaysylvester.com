BEGIN;

-- Make room for Flisk at the beginning of the gallery.
UPDATE screens
SET sort = sort + 20;

INSERT INTO case_studies (
  company_name,
  company_url,
  title,
  summary,
  content,
  tagline,
  vertical,
  platform,
  expertise,
  sort,
  featured
)
VALUES (
  'Flisk',
  'Flisk',
  'Flisk Agent-Driven Tracking Implementation',
  '<strong>Flisk</strong> handles tracking implementation, monitoring, maintenance, and documentation across your entire stack. I moderated over a hundred user research sessions and designed an AI-native agent experience that maintains context on the user&apos;s behalf, ensuring reliable, repeatable agent behavior across many complex use cases.',
  '<h2>Case study coming soon</h2><p>I&apos;m still working on this case study. In the meantime, browse the product and marketing website screens in the <a href="/gallery">gallery</a>.</p>',
  'Nobody thinks tracking implementation and maintenance is fun — except maybe Flisk.',
  'AI / MarTech',
  'Responsive Web / Web Application',
  'Product Management / User Research / Product Design / Full-Stack Development',
  COALESCE((SELECT MIN(sort) FROM case_studies), 1) - 1,
  false
);

-- Cloudinary public IDs are relative to jaysylvester.com/screens, matching the
-- existing screens.url convention.
INSERT INTO screens (company, url, alt, sort, category, featured)
VALUES
  ('Flisk', 'Flisk-app-A1-a-onboarding-first-run-light.png',
   'Flisk first-run onboarding screen (light theme)',
   1, 'Flisk application', false),
  ('Flisk', 'Flisk-app-A2-a-onboarding-partly-complete-light.png',
   'Flisk partly completed onboarding screen (light theme)',
   2, 'Flisk application', false),
  ('Flisk', 'Flisk-app-B1-a-dashboard-light.png',
   'Flisk dashboard (light theme)',
   3, 'Flisk application', true),
  ('Flisk', 'Flisk-app-B2-a-gtm-container-light.png',
   'Flisk Google Tag Manager container screen (light theme)',
   4, 'Flisk application', false),
  ('Flisk', 'Flisk-app-B3-a-events-light.png',
   'Flisk events screen (light theme)',
   5, 'Flisk application', false),
  ('Flisk', 'Flisk-app-B4-a-settings-light.png',
   'Flisk settings screen (light theme)',
   6, 'Flisk application', false),
  ('Flisk', 'Flisk-app-A1-b-onboarding-first-run-dark.png',
   'Flisk first-run onboarding screen (dark theme)',
   7, 'Flisk application', false),
  ('Flisk', 'Flisk-app-A2-b-onboarding-partly-complete-dark.png',
   'Flisk partly completed onboarding screen (dark theme)',
   8, 'Flisk application', false),
  ('Flisk', 'Flisk-app-B1-b-dashboard-dark.png',
   'Flisk dashboard (dark theme)',
   9, 'Flisk application', false),
  ('Flisk', 'Flisk-app-B2-b-gtm-container-dark.png',
   'Flisk Google Tag Manager container screen (dark theme)',
   10, 'Flisk application', false),
  ('Flisk', 'Flisk-app-B3-b-events-dark.png',
   'Flisk events screen (dark theme)',
   11, 'Flisk application', false),
  ('Flisk', 'Flisk-app-B4-b-settings-dark.png',
   'Flisk settings screen (dark theme)',
   12, 'Flisk application', false),
  ('Flisk', 'Flisk-website-A1-a-home-desktop.png',
   'Flisk home page (desktop)',
   13, 'Flisk website', true),
  ('Flisk', 'Flisk-website-A1-c-home-mobile-430.png',
   'Flisk home page (mobile)',
   14, 'Flisk website', false),
  ('Flisk', 'Flisk-website-B1-a-pricing-desktop.png',
   'Flisk pricing page (desktop)',
   15, 'Flisk website', false),
  ('Flisk', 'Flisk-website-B1-c-pricing-mobile-430.png',
   'Flisk pricing page (mobile)',
   16, 'Flisk website', false),
  ('Flisk', 'Flisk-website-B2-a-about-desktop.png',
   'Flisk about page (desktop)',
   17, 'Flisk website', false),
  ('Flisk', 'Flisk-website-B2-c-about-mobile-430.png',
   'Flisk about page (mobile)',
   18, 'Flisk website', false),
  ('Flisk', 'Flisk-website-B3-a-gtm-desktop.png',
   'Flisk Google Tag Manager page (desktop)',
   19, 'Flisk website', false),
  ('Flisk', 'Flisk-website-B4-a-free-trial-desktop.png',
   'Flisk free trial page (desktop)',
   20, 'Flisk website', false);

COMMIT;
