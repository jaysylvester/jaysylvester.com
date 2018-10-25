

CREATE TABLE case_studies (
    id SERIAL PRIMARY KEY,
    company_name text,
    company_url text,
    title text,
    summary text,
    content text,
    tagline text,
    vertical text,
    platform text,
    expertise text,
    sort integer
);

CREATE TABLE screens (
    id SERIAL PRIMARY KEY,
    company text,
    url text,
    alt text,
    sort integer,
    category text
);

CREATE TABLE work_history (
    id SERIAL PRIMARY KEY,
    employer_name text,
    employer_url text,
    job_title text,
    job_description text,
    employed_from date,
    employed_to date
);


-- delete from case_studies;
-- delete from screens;
-- delete from work_history;

insert into work_history
( employer_name, employer_url, job_title, job_description, employed_from, employed_to )
values
( 'Vidyo', 'Vidyo', 'UX Lead', 'Vidyo welcomed me to their growing UX team in order to build an internal design practice and help transform the company into a customer-focused organization. I defined the process for user experience research and design and managed the UX designers responsible for the company’s flagship video conferencing systems, including desktop, mobile, and conference room applications.', '2015-10-01', '2018-01-01' );

insert into work_history
( employer_name, employer_url, job_title, job_description, employed_from, employed_to )
values
( 'Fitly', 'Fitly', 'Creative Director', 'I led the responsive redesign of a startup incubator product under a tight deadline, implementing a rapid mobile first design process that started with mobile wireframes and then went straight to coding and designing on the fly in the browser. We followed up with design comps for phase two, improving the visual design and proposing feature enhancements.', '2014-02-01', '2014-07-01' );

insert into work_history
( employer_name, employer_url, job_title, job_description, employed_from, employed_to )
values
( 'hibu', 'hibu', 'UX Lead', 'While managing a blended UI team consisting of UX designers and front end developers, I promoted a user-centered design philosophy across the organization that established the needs of the customer as the primary consideration in all feature development. We produced wireframes, prototypes, and final production code for hibu web properties.', '2012-10-01', '2014-06-01' );

insert into work_history
( employer_name, employer_url, job_title, job_description, employed_from, employed_to )
values
( 'Abercrombie & Fitch', 'Abercrombie-and-Fitch', 'Manager of UI Development', 'I led a large team of UI engineers responsible for all e-commerce front end development. Building strong partnerships with stakeholders, UX architects, visual designers, and my IT colleagues, I broke down traditional silos and got us working collaboratively. My team overhauled the front end code base, drastically improving performance and maintainability.', '2010-04-01', '2012-05-01' );

insert into work_history
( employer_name, employer_url, job_title, job_description, employed_from, employed_to )
values
( 'WebLinc', 'WebLinc', 'Senior Front End Developer', 'As a hands-on developer, I performed sophisticated front end development on large-scale e-commerce platforms utilizing standards compliant HTML, CSS, and JavaScript. Leading several development projects, I mentored junior front end developers and advised designers on appropriate user interface design elements based on their technical feasibility.', '2009-05-01', '2010-04-01' );

insert into work_history
( employer_name, employer_url, job_title, job_description, employed_from, employed_to )
values
( 'NetPlus Marketing', 'NetPlus-Marketing', 'Lead Developer and SEO Manager', 'I managed the small but highly productive team responsible for all client web site programming, while also assuming responsibility for IA/UX artifacts including sitemaps, taxonomies, flowcharts, wireframes, and HTML prototypes. As SEO Manager, I authored detailed web site SEO recommendations based on extensive reviews of site content and analytics.', '2006-04-01', '2008-08-01' );

insert into work_history
( employer_name, employer_url, job_title, job_description, employed_from, employed_to )
values
( 'Ricoh Corporation', 'Ricoh-Corporation', 'Web Specialist', 'I redesigned the human resources intranet site, replacing an outdated and confusing layout with vastly improved information architecture and a contemporary look and feel. I also optimized all Ricoh subsidiaries'' sites for search engine rankings, writing meta descriptions and page content and proposing information architecture changes.', '2004-10-01', '2006-05-01' );

insert into work_history
( employer_name, employer_url, job_title, job_description, employed_from, employed_to )
values
( 'Panasonic Consumer Electronics', 'Panasonic-Consumer-Electronics', 'Web Producer', 'I supervised our interactive agency, reviewing and approving all sites within core product lines including TV, Home Theater, and Home Appliances. Through careful planning with product managers and the advertising department, I coordinated site updates with product introductions, promotions, and events. I also designed and coded the Panasonic Premium sales incentive web site.', '2000-05-01', '2004-10-01' );

insert into case_studies
( company_name, company_url, title, tagline, vertical, platform, expertise, summary, content, sort )
values
( 'Vidyo', 'Vidyo', 'Vidyo Remote Collaboration Solutions', 'Video conferencing and collaboration that goes well beyond the typical Skype call', 'Video Conferencing &amp; Collaboration', 'Desktop / Mobile / Web', 'UX Design / Team Management', 'Vidyo had a complex suite of video conferencing apps that spanned many platforms, but a lack of design standards made the experience inconsistent across devices. I defined crucial UX processes and led the design team in establishing a unified presentation across the entire product line.', '<p>Vidyo built their brand on breakthrough technology that enables high-quality, low bandwidth video conferencing with hundreds of participants across pretty much any device you can imagine: phones, tablets, computers, and even multi-screen conference room systems. The superiority of the underlying technology was enough to drive their initial success, but today’s customers expect great technology to be paired with great design. Recognizing that crucial need, Vidyo hired me to establish UX process, manage and grow the UX team, and drive the adoption of user-centered design across the organization.</p>

<h2>Broken process</h2>

<p>Vidyo’s original video conferencing applications, VidyoDesktop and VidyoMobile, had languished for years, and their replacement, the Vidyo Neo software suite, was an attempt to address the bulk of their outstanding issues in one fell swoop. Being new to the company and the project, I was asked to supplement the existing design team as a UX designer, with the UX team reporting to the engineering lead. It was an odd arrangement, but there was a tight deadline and heavy pressure to complete the work, and I wanted to help however I could.</p>

<p>Vidyo Neo ended up serving as an unfortunate case study on how not to implement a redesign for a bevy of reasons:</p>

<h3>Product- and Engineering-driven design workflow</h3>
<p>A designer expects their designs to be subject to review to ensure the requirements are met and implementation is feasible. However, the product manager and engineering lead on Vidyo Neo effectively acted as the design leads, overruling the design team frequently despite neither having a design background. To make matters worse, no single UX designer was assigned as the design lead, so establishing process and consistency across the UX team was difficult. Design by committee became the norm and reaching consensus involved uncomfortable, contentious meetings where the loudest and most stubborn participant got their way.</p>

<h3>Insufficient design resources</h3>
<p>The UX designers at Vidyo not only performed all design functions, but all UI development as well (myself included), so in addition to dealing with design reviews and deadlines, they were also responsible for meeting engineering production deadlines while being hammered by QA for defects at the same time. It was impossible to give design tasks the focus they deserved.</p>

<h3>Lack of user and customer research</h3>
<p>Many assumptions were made about what was lacking in VidyoDesktop and VidyoMobile because no qualitative or quantitative data existed to identify shortcomings and prioritize features, leading to no clear vision or strategy. In addition, the Vidyo Neo design was heavily influenced by Vidyo company culture and employee mindset; it was assumed our customers used our products the same way we did, leading to a false-consensus effect.</p>

<h3>Overemphasis on competitive analysis</h3>
<p>Competitive analysis has its place in any product development workflow; good design often entails a certain amount of inspiration by competitors. However, it''s a risky gamble to assume that your successful competitors are doing everything right and that your customers’ goals align with their customers’ goals. Rather than interviewing our customers to discover what they felt our product lacked, conducting appropriate usability studies, and creating a product based on user input, the Vidyo Neo roadmap was pulled almost entirely from competitors’ existing feature sets.</p>

<h3>No user testing or iteration</h3>
<p>While talented designers have good instincts, nothing can replace proper usability testing. Everything we designed went straight into the development pipeline and was released to the public. We received our first feedback from customers after the feature went into production. Once a feature went into production, it was usually forgotten in favor of the next set of features.</p>

<p>Not surprisingly, working on Vidyo Neo with broken or lacking process was a tough slog, and while customers told us it was an improvement over the previous generation of products, I knew we could do much better.</p>

<h2>Redesigning design at Vidyo</h2>

<p>After my experience with Vidyo Neo, I was determined to implement a proper UX process that would establish research and customer data as the primary drivers behind our feature roadmap and design decisions, while at the same time making the design/development workflow more collaborative and productive. I was afforded that opportunity when management decided to embark on a massive rebranding effort and product overhaul.</p>

<p>The following products were part of the rebranding initiative:</p>

<ul>
<li>VidyoConnect (formerly Vidyo Neo), consisting of desktop, mobile, and web video conferencing clients</li>
<li>VidyoRoom, our conference room system</li>
<li>VidyoCore, our web-based meeting resource management suite</li>
</ul>

<p>I began my new role as UX Lead fully empowered to incorporate process improvements and expand the UX team in order to undertake redesigns of all the above-mentioned products. Here is what I did:</p>

<h3>Introduced a UX-driven design workflow</h3>
<p>I was reassigned from the engineering team to the product group and given responsibility for all final design decisions. My team worked with a new group of product managers on our new projects and they focused their time on managing the roadmap and feature requirements rather than dictating design. To help explain the process changes I was proposing, I created documentation for Product/Engineering/QA and walked them through examples of healthy UX workflows.</p>

<figure class="callout ux-process">
    <a class="new-tab" href="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_80/jaysylvester.com/case-studies/Vidyo/ux-process.jpg" target="_blank" title="Open this image in a new tab">
      <noscript>
        <img src="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_50,w_500/jaysylvester.com/case-studies/Vidyo/ux-process.png" alt="UX and development process flow chart">
      </noscript>
      <img data-src="https://res.cloudinary.com/tehinnernets/image/upload/[parameters]/jaysylvester.com/case-studies/Vidyo/ux-process.png" alt="UX and development process flow chart">
    </a>
<figcaption>My recommendation of a healthy design workflow within a development environment</figcaption>
</figure>

<h3>Built a tiered UX team</h3>
<p>I was provided budget to make several new hires, which I allocated as follows: a senior designer, two mid-level designers, and a junior designer, all with varying levels of experience across different aspects of UX (research, information architecture, interaction design, visual design, etc.), giving us a well-rounded skill set. With this structure, I was able to allocate resources effectively by assigning myself or the senior designer as project lead while the mid-level and junior designers were assigned tasks based on availability. I also empowered the designers by encouraging them to take ownership of their designs and run their own review sessions with stakeholders.</p>

<h3>Involved customers in the product design process</h3>
<p>I reached out to a cross-section of our customers and requested on-site interviews and tours of their facilities so we could better understand how they used our products. We listened intently to their feedback and saw the unique and varied ways they put our products to use—some of which we hadn’t even considered as use cases. These revelations gave us a new perspective, but just as important, we established meaningful relationships with our customers, reinforcing their value to us and reassuring them that their needs were being addressed.</p>

<h3>Conducted extensive usability studies</h3>
<p>I wanted a true understanding of our competitors’ products and how we stacked up against them, so my team conducted usability studies on both our existing products and our competitors’ products. We moderated the first batch of sessions in person and conducted additional studies with remote participants. Combining the results of these studies with our customer interviews, we created a UX audit containing recommendations for Vidyo Neo enhancements.</p>

<figure class="callout usability-study">
    <a class="new-tab" href="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_80/jaysylvester.com/case-studies/Vidyo/usability-study.jpg" target="_blank" title="Open this image in a new tab">
      <noscript>
        <img src="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_50,w_500/jaysylvester.com/case-studies/Vidyo/usability-study.jpg" alt="A screen cap of a usability study session">
      </noscript>
      <img data-src="https://res.cloudinary.com/tehinnernets/image/upload/[parameters]/jaysylvester.com/case-studies/Vidyo/usability-study.jpg" alt="A screen cap of a usability study session">
    </a>
<figcaption>A Vidyo Neo usability study participant attempts to search her contact list</figcaption>
</figure>

<h3>Created a style guide for design components and document templates</h3>
<p>Even a small team of designers can struggle with consistency across many design documents covering multiple products. We created a shared UX library consisting of a simple style guide, common design elements, and UX document templates so engineering received consistent and predictable static mockups.</p>

<figure class="callout style-guide">
    <a class="new-tab" href="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_80/jaysylvester.com/case-studies/Vidyo/style-guide.jpg" target="_blank" title="Open this image in a new tab">
      <noscript>
        <img src="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_50,w_500/jaysylvester.com/case-studies/Vidyo/style-guide.jpg" alt="A screen cap of the Vidyo UX style guide">
      </noscript>
      <img data-src="https://res.cloudinary.com/tehinnernets/image/upload/[parameters]/jaysylvester.com/case-studies/Vidyo/style-guide.jpg" alt="A screen cap of the Vidyo UX style guide">
    </a>
<figcaption>Part of our style guide</figcaption>
</figure>

<h3>Built prototypes and iterated designs based on research</h3>
<p>Continuing with our new testing procedure, we iterated our static designs and built prototypes to address previously unseen usability problems and also created entirely new approaches in our rebranded products like VidyoConnect. We then built prototypes of varying complexity in order to demonstrate new features and functionality and conduct usability testing prior to implementation. In most cases, we used tools like InVision and Adobe XD to quickly convert static mockups into clickable prototypes. For the redesign of the desktop app, VidyoConnect, which involved complex user interactions and an extensive new set of features, I created an almost fully-functional prototype built in Electron that behaved as the real app would.</p>

<figure class="callout prototype">
    <a class="new-tab" href="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_80/jaysylvester.com/case-studies/Vidyo/VidyoConnect-prototype.jpg" target="_blank" title="Open this image in a new tab">
      <noscript>
        <img src="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_50,w_500/jaysylvester.com/case-studies/Vidyo/VidyoConnect-prototype.jpg" alt="A screen cap of the VidyoConnect prototype">
      </noscript>
      <img data-src="https://res.cloudinary.com/tehinnernets/image/upload/[parameters]/jaysylvester.com/case-studies/Vidyo/VidyoConnect-prototype.jpg" alt="A screen cap of the VidyoConnect prototype">
    </a>
<figcaption>VidyoConnect desktop prototype built with Electron (note the live camera capture)</figcaption>
</figure>

<p>I brought process, guidance, and years of experience to a relatively junior team who brought dedication, a willingness to try new things, and their own perspective. That combination enabled us to transform a fledgling product lineup into an example of what UX can bring when it’s correctly applied.</p>

<p>Below are various samples of my team''s output across several Vidyo projects.</p>', 1 );

insert into screens
( company, url, alt, category, sort )
values
( 'Vidyo', 'Vidyo-Neo-1.jpg', 'A screenshot of Vidyo Neo v1.0', 'Vidyo Neo v1.0', 1 ),
( 'Vidyo', 'Vidyo-Neo-2.jpg', 'A screenshot of Vidyo Neo v1.0', 'Vidyo Neo v1.0', 2 ),
( 'Vidyo', 'Vidyo-Neo-3.jpg', 'A screenshot of Vidyo Neo v1.0', 'Vidyo Neo v1.0', 3 ),
( 'Vidyo', 'Vidyo-Neo-4.jpg', 'A screenshot of Vidyo Neo v1.0', 'Vidyo Neo v1.0', 4 ),
( 'Vidyo', 'VidyoConnect-1.jpg', 'A screenshot of VidyoConnect (Vidyo Neo v2.0)', 'VidyoConnect (Vidyo Neo v2.0)', 5 ),
( 'Vidyo', 'VidyoConnect-2.jpg', 'A screenshot of VidyoConnect (Vidyo Neo v2.0)', 'VidyoConnect (Vidyo Neo v2.0)', 6 ),
( 'Vidyo', 'VidyoConnect-3.jpg', 'A screenshot of VidyoConnect (Vidyo Neo v2.0)', 'VidyoConnect (Vidyo Neo v2.0)', 7 ),
( 'Vidyo', 'VidyoConnect-4.jpg', 'A screenshot of VidyoConnect (Vidyo Neo v2.0)', 'VidyoConnect (Vidyo Neo v2.0)', 8 ),
( 'Vidyo', 'VidyoCore-1.jpg', 'A screenshot of the VidyoCore conference mannagement suite', 'VidyoCore conference management suite', 9 ),
( 'Vidyo', 'VidyoCore-2.jpg', 'A screenshot of the VidyoCore conference mannagement suite', 'VidyoCore conference management suite', 10 ),
( 'Vidyo', 'VidyoCore-3.jpg', 'A screenshot of the VidyoCore conference mannagement suite', 'VidyoCore conference management suite', 11 ),
( 'Vidyo', 'VidyoCore-4.jpg', 'A screenshot of the VidyoCore conference mannagement suite', 'VidyoCore conference management suite', 12 ),
( 'Vidyo', 'VidyoConnect-mobile-1.jpg', 'A screenshot of VidyoConnect Mobile', 'VidyoConnect Mobile', 13 ),
( 'Vidyo', 'VidyoConnect-mobile-2.jpg', 'A screenshot of VidyoConnect Mobile', 'VidyoConnect Mobile', 14 ),
( 'Vidyo', 'VidyoConnect-mobile-3.jpg', 'A screenshot of VidyoConnect Mobile', 'VidyoConnect Mobile', 15 ),
( 'Vidyo', 'VidyoConnect-mobile-4.jpg', 'A screenshot of VidyoConnect Mobile', 'VidyoConnect Mobile', 16 );


insert into case_studies
( company_name, company_url, title, tagline, vertical, platform, expertise, summary, content, sort )
values
( 'Abercrombie & Fitch', 'Abercrombie-and-Fitch', 'Abercrombie &amp; Fitch Online Store', 'Four brands, thirty international sites, and one framework', 'E-commerce', 'Web', 'UI Architecture / Front End Development / Team Management', 'Abercrombie & Fitch had four distinct brands running on four distinct code bases, leading to lots of duplicate development effort. My team engineered a front end framework that let them spend less time chasing problems and more time building solutions.', '<p>
When I first joined the e-commerce team at Abercrombie &amp; Fitch, the front end code base needed a lot of work. Each of the company''s 4 brands&mdash;Abercrombie &amp; Fitch, abercrombie kids, Hollister Co., and Gilly Hicks&mdash;ran on its own set of JSPs, CSS files, and JavaScript libraries. There were different JavaScript libraries used across brands; some had jQuery, some had YUI, and some even had both being used simultaneously. Gilly Hicks, based on Flex, was entirely inconsistent with the other 3 brands. Any new feature requested by our business users required duplicated development effort. In many cases, up to 4 uniquely engineered solutions were required for the exact same feature.
</p>
<p>
Process was also a challenge. Ever-changing business requirements and new requests were pouring into the e-commerce department and flooding them with tasks for their weekly releases, but there was little process in place to handle the requests. Business users were accustomed to handing off thin requirements at the last minute and developers were working at a frantic pace with a QA process that consisted only of rushed peer reviews that were little more than a rubber stamp. Customer satisfaction and code quality were low, as was developers'' morale.
</p>
<p>
Working alongside the e-commerce department''s talented Java developers, my team replaced the Flex-based Gilly Hicks front end with an entirely new set of JSPs containing semantic, SEO-friendly markup, neatly organized CSS files with descriptive file names, and a new common JavaScript library standardized on jQuery. We decoupled the CSS and JavaScript from the markup, minimizing page size and cleaning up the JSPs considerably. Separating content from presentation also allowed us to create a site build that included only JavaScript and CSS libraries; we were able to deploy static changes without running a full site build, letting us respond faster to business requests. And well before &quot;responsive design&quot; had become the next hot industry buzzword, we''d constructed a front end framework that would require only CSS and JavaScript changes in order to accommodate devices of any size, e.g. smartphones, tablets, and netbooks.
</p>
<p>
Following an extremely aggressive development schedule and successful launch of the Gilly Hicks e-commerce site in July 2010, we saw significant increases in organic search engine traffic and much improved app server and front end performance. With the front end framework in place, we needed some breathing room to handle the deluge of maintenance requests while maintaining the new framework we''d built, so my next priority was to establish a firm process for handling weekly release tasks.
</p>
<p>
The biggest process challenge facing the e-commerce team was a failure to control and schedule incoming business requests. As long as the request came in by Wednesday, it was almost always expected to be in that week''s Thursday morning release. I introduced a simple process involving cut-off times for various stages of the release schedule and established defined roles and expectations for everyone involved in the process. Put simply, all development, feedback, and iterations had to occur on Thursday, Friday, and Monday, and all business reviews and approvals had to be received by Tuesday, allowing us one full day for internal QA and performance testing prior to the Thursday morning release. Business users were required to be more engaged in the development process and take ownership of their requests, and developers became more aware of the quality control issues caused by rushed development and QA. The success of this simple process change helped alleviate mounting frustrations and QA problems and set us on the road to implementing further process improvements to come.
</p>
<p>
With both our code and our process on the road to recovery, we rolled out subsequent redesigns of the other 3 brands over the next 10 months on top of the new framework. Each brand redesign brought with it functional and design enhancements that had to be incorporated into all brands, and thanks to the streamlined framework, we were able to implement these improvements across all brands simultaneously with much less effort than separate code bases would have required. With the help of the ops team, we also introduced YUI Compressor and Closure Compiler into our build process to concatenate and minify our CSS and JavaScript libraries, further shrinking the size of our front end code and improving page performance.
</p>
<p>
During my second year at Abercrombie, we implemented a series of further improvements and enhancements to our front end code, including several iterations of our JavaScript framework and the introduction of practical cross-browser HTML5 that degrades gracefully, all while tackling massive projects like complete redesigns of our checkout flow and user account section. Bottom line: we got a lot done.
</p>
<p>
Today, Abercrombie''s various brands are in a much better position to tackle future e-commerce challenges thanks to the work performed by the front end team under my leadership.
</p>', 4 );

insert into screens
( company, url, alt, category, sort )
values
( 'Abercrombie-and-Fitch', 'Abercrombie.jpg', 'Abcrombie home page', 'All four Abercrombie brands using the same front end framework', 32 ),
( 'Abercrombie-and-Fitch', 'abercrombie-kids.jpg', 'abercrombie kids home page', 'All four Abercrombie brands using the same front end framework', 33 ),
( 'Abercrombie-and-Fitch', 'Hollister.jpg', 'Hollister home page', 'All four Abercrombie brands using the same front end framework', 34 ),
( 'Abercrombie-and-Fitch', 'Gilly-Hicks.jpg', 'Gilly Hicks home page', 'All four Abercrombie brands using the same front end framework', 35 );


insert into case_studies
( company_name, company_url, title, tagline, vertical, platform, expertise, summary, content, sort )
values
( 'hibu', 'hibu', 'hibu Marketplace Responsive Design', 'There is no such thing as the "mobile web"', 'E-commerce', 'Responsive Web', 'UX Design / UI Architecture / Team Management', 'hibu had an e-commerce platform with lots of legacy code and a design that wasn''t ready for mobile devices. My team rebuilt the UI from scratch, then devised a plan to go responsive and improve the experience for millions of mobile and tablet users.', '
<p>
hibu acquired Znode, an e-commerce startup, in order to use their .NET e-commerce platform as the foundation for a series of new products. One such product was the hibu Marketplace, an international online "mall" with a local focus that would allow small merchants to create online storefronts and sell their goods and services to both local and national audiences. After a hurried beta launch, the product owners wanted to take the Marketplace to the next level, at which point I was brought on board to oversee UX design and UI development.
</p>
<h3>
Laying the Foundation
</h3>
<p>
While the core Znode product was a capable e-commerce platform, it was weighed down by years of legacy code that were then passed on to the Marketplace. In addition, a gap in UX expertise during its rushed development resulted in a shopping experience that wasn''t up to current standards. The mobile version of the site was on a completely different platform (Java) with its own development team in another geographic location. All the technical leads agreed this was a less than ideal foundation upon which to build a flagship product.
</p>
<p>
After many strategy sessions and architectural debates, the .NET technical leads decided to rebuild the Webforms-based back end using a proper MVC framework, and I took this opportunity to completely rebuild the front end framework in order to prepare it for an eventual responsive redesign. I also wanted a front end that was accessible to all users and didn''t have essential functions that were dependent on JavaScript.
</p>
<p>
<a href="/case-study/company/Abercrombie-and-Fitch">Much like I''d done for Abercrombie &amp; Fitch</a> a few years before, I led the front end development team through a complete architectural redesign of the Marketplace front end framework. We rewrote most of the HTML, replacing scores of unnecessary nested containers with clean, semantic markup labeled with sensible IDs and classes. We threw out the existing CSS and replaced it with Sass, making use of variables and writing a library of reusable mixins. We removed the front end''s dependency on built-in .NET JavaScript functions and implemented a logical JavaScript framework based on the module pattern and a select few JavaScript libraries. We minimized the UI''s dependency on images by replacing all icons and image-based buttons with @font-face glyphs and CSS-based button styles; any design-related images that remained were incorporated into a single CSS sprite.
</p>
<p>
By the time we wrapped up the second release, the Marketplace had a modern, forward-thinking front end code base with concatenated and minified CSS and JavaScript libraries, minimal dependence on images, far fewer HTTP requests, and accessible markup that was SEO friendly. The .NET MVC effort was equally successful in terms of performance improvements and code that was easier to maintain. The hibu Marketplace was leaner, faster, and better than it was when we started. While proud of our technical accomplishments, we knew we still had a lot of work to do.
</p>
<h3>
Selling Responsive Design
</h3>
<p>
Before we could begin a responsive redesign, I had to sell the idea to senior management, so I spent a few days designing and building a semi-functional home page prototype to demonstrate the possibilities of responsive design. Incorporating requests from our merchandizers, I brought product imagery to the forefront and gave them space for promotional content that was lacking in the current design. Knowing that the concept would be demonstrated to business users on phones and tablets and given the limited amount of time I had to put it together, I focused my testing on iOS and Android phones and tablets.
</p>

<figure role="group" class="callout concept">
<figure>
    <a class="new-tab" href="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_80/jaysylvester.com/case-studies/hibu/eMP-concept-mobile.jpg" target="_blank" title="Open this image in a new tab">
      <noscript>
        <img src="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_50,w_500/jaysylvester.com/case-studies/hibu/eMP-concept-mobile.jpg" alt="A screen cap of my hibu Marketplace mobile concept">
      </noscript>
      <img data-src="https://res.cloudinary.com/tehinnernets/image/upload/[parameters]/jaysylvester.com/case-studies/hibu/eMP-concept-mobile.jpg" alt="A screen cap of my hibu Marketplace mobile concept">
    </a>
</figure>
<figure>
    <a class="new-tab" href="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_80/jaysylvester.com/case-studies/hibu/eMP-concept-tablet.jpg" target="_blank" title="Open this image in a new tab">
      <noscript>
        <img src="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_50,w_500/jaysylvester.com/case-studies/hibu/eMP-concept-tablet.jpg" alt="A screen cap of my hibu Marketplace tablet concept">
      </noscript>
      <img data-src="https://res.cloudinary.com/tehinnernets/image/upload/[parameters]/jaysylvester.com/case-studies/hibu/eMP-concept-tablet.jpg" alt="A screen cap of my hibu Marketplace tablet concept">
    </a>
</figure>
<figcaption>hibu Marketplace responsive design proof of concept (HTML)</figcaption>
</figure>

<p>
The concept was successful at demonstrating how the same content and functionality could be made to work across many different devices, and I received an enthusiastic approval to proceed with the Marketplace responsive UX design work.
</p>
<h3>
Strategy &amp; Process
</h3>
<p>
We had minimal strategic input from the business, but we were able to establish the following goals:
</p>
<ul>
<li>
  We would take a mobile first approach and provide all devices access to the same content, adding appropriate enhancements and fallbacks based on device capability.
</li>
<li>
  The focus on local products and services should continue to be a key strategy.
</li>
<li>
  Beautiful product imagery should dominate the design and provide most of the visual interest.
</li>
<li>
  At the request of our merchandisers, the layout should accommodate increased merchandising content, particularly on category pages.
</li>
</ul>
<p>
I conducted a series of planning meetings with my team to identify our goals and put together a basic project plan. We started with a complete site audit, building inventories of content, functionality, and interface elements. Using that as a starting point and basing our decisions on the goals above, we decided what functionality was essential and should be maintained, what functionality could go, and what was missing. I directed one UX designer to create style tiles based on the interface inventory so that everyone could work independently, but still maintain a consistent look and feel. I assigned a UX designer to each page on the site, and it was each designer''s responsibility to come up with the initial concept and wireframes under my guidance, which we would then flesh out as a team in our daily review sessions.
</p>
<p>
We spent the next round of meetings discussing the challenges of UX design on a responsive redesign project with a tight deadline. What should be our target viewport sizes and where should we set our breakpoints? Should we adopt a mobile first approach? Should we use an existing framework or roll our own? What would be our deliverables? In all our discussions, one thing was clear: after coming to a general concensus during our whiteboard sessions, we should go directly to low-fidelity prototyping in the browser. Draw it on the whiteboard, take a picture with your phone, then get back to your desk and start coding. It would be a Lean UX process based on discussing, sketching, prototyping, testing, and iterating, and the final deliverable would be low-fidelity, fully responsive HTML prototypes of the entire site.
</p>

<figure class="callout whiteboard">
  <a class="new-tab" href="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_80/jaysylvester.com/case-studies/hibu/eMP-whiteboard-home.jpg" target="_blank" title="Open this image in a new tab">
    <noscript>
      <img src="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_50,w_500/jaysylvester.com/case-studies/hibu/eMP-whiteboard-home.jpg" alt="A photo of our Marketplace whiteboard sketches">
    </noscript>
    <img data-src="https://res.cloudinary.com/tehinnernets/image/upload/[parameters]/jaysylvester.com/case-studies/hibu/eMP-whiteboard-home.jpg" alt="A photo of our Marketplace whiteboard sketches">
  </a>
<figcaption>hibu Marketplace home page whiteboard sketches</figcaption>
</figure>

<p>
HTML wireframes have many advantages over flat wireframes. Our wireframes would be interactive and responsive, so they could be viewed on any device in a browser and behave  like the final product would; just toss them onto a server and give stakeholders the URL. Many interaction design decisions made during the UX process wouldn''t need to be written down in technical documentation because they would be self-evident. For example, if clicking on an anchor should cause a form to slide down and be fully visible in 250 milliseconds, it''s right there in the wireframe and its source code. The risk of details getting lost in translation from wireframe to final code is greatly reduced compared to a traditional flat wireframe. Another benefit would be easy versioning using a git repository and local branching, just like production code. And large sections of that very same code would be reusable in the production version as well.
</p>

<figure role="group" class="callout prototype">
<figure>
  <a class="new-tab" href="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_80/jaysylvester.com/case-studies/hibu/eMP-home-open-mobile.jpg" target="_blank" title="Open this image in a new tab">
    <noscript>
      <img src="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_50,w_500/jaysylvester.com/case-studies/hibu/eMP-home-open-mobile.jpg" alt="A screen cap of the hibu Marketplace responsive redesign mobile home page prototype">
    </noscript>
    <img data-src="https://res.cloudinary.com/tehinnernets/image/upload/[parameters]/jaysylvester.com/case-studies/hibu/eMP-home-open-mobile.jpg" alt="A screen cap of the hibu Marketplace responsive redesign mobile home page prototype">
  </a>
</figure>
<figure>
  <a class="new-tab" href="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_80/jaysylvester.com/case-studies/hibu/eMP-home-open-tablet.jpg" target="_blank" title="Open this image in a new tab">
    <noscript>
      <img src="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_50,w_500/jaysylvester.com/case-studies/hibu/eMP-home-open-tablet.jpg" alt="A screen cap of the hibu Marketplace responsive redesign tablet home page prototype">
    </noscript>
    <img data-src="https://res.cloudinary.com/tehinnernets/image/upload/[parameters]/jaysylvester.com/case-studies/hibu/eMP-home-open-tablet.jpg" alt="A screen cap of the hibu Marketplace responsive redesign tablet home page prototype">
  </a>
</figure>
<figcaption>hibu Marketplace responsive design proof of concept (HTML)</figcaption>
</figure>

<p>
Lots of teams are struggling through the complexities of UX in a responsive design, and using a Lean UX process, my team delivered on the goal of producing functional wireframes that effectively convey the requirements of responsive e-commerce. This project convinced me that responsive design is the future, and that the advantages of a mobile first approach far outweigh the IA/UX difficulties that come up during the design process.
</p>
<p>
While the challenges of UX design on a responsive project are significant, we proved they''re not insurmountable.
</p>', 3 );

insert into screens
( company, url, alt, category, sort )
values
( 'hibu', 'eMP-home-mobile.jpg', 'hibu Marketplace HTML prototype (home page, mobile)', 'hibu Marketplace HTML prototype', 24 ),
( 'hibu', 'eMP-home-desktop.jpg', 'hibu Marketplace HTML prototype (home page, desktop)', 'hibu Marketplace HTML prototype', 25 ),
( 'hibu', 'eMP-category-mobile.jpg', 'hibu Marketplace HTML prototype (category page, mobile)', 'hibu Marketplace HTML prototype', 26 ),
( 'hibu', 'eMP-category-desktop.jpg', 'hibu Marketplace HTML prototype (category page, desktop)', 'hibu Marketplace HTML prototype', 27 ),
( 'hibu', 'eMP-search-mobile.jpg', 'hibu Marketplace HTML prototype (search results, mobile)', 'hibu Marketplace HTML prototype', 28 ),
( 'hibu', 'eMP-search-desktop.jpg', 'hibu Marketplace HTML prototype (search results, desktop)', 'hibu Marketplace HTML prototype', 29 ),
( 'hibu', 'eMP-cart-mobile.jpg', 'hibu Marketplace HTML prototype (shopping cart, mobile)', 'hibu Marketplace HTML prototype', 30 ),
( 'hibu', 'eMP-cart-desktop.jpg', 'hibu Marketplace HTML prototype (shopping cart, desktop)', 'hibu Marketplace HTML prototype', 31 );


insert into case_studies
( company_name, company_url, title, tagline, vertical, platform, expertise, summary, content, sort )
values
( 'OncoTracker', 'OncoTracker', 'OncoTracker Portable Medical Records', 'Cancer patients should be focused on their treatment, not their treatment records', 'Healthcare', 'Web', 'Information Architecture / UX Design / Full-Stack Development', 'OncoTracker wanted to provide an easy way for oncology patients to access their medical records anywhere. I designed a solution that walks users through the process of entering their records step by step and allows them to track the progress of their treatment.', '<p>
OncoTracker approached me with their idea for a service to allow oncology patients to store their treatment records online. Cancer patients, already burdened with their illness, carry the stress of transporting extensive medical records from physician to physician over the course of lengthy treatment cycles. If they could store their records online, any doctor or family member with the appropriate credentials could login and view the patient''s medical history, relieving them of this additional burden. OncoTracker wanted a web site that would walk users through the process of entering their medical records and allow them to export those records when necessary. With this set of fairly open requirements and a very aggressive timeline, I got to work.
</p>
<p>
The first step was coming up with a logical, friendly architecture that would guide users through the process of inputting lengthy treatment records that potentially span multiple treatment cycles from a series of physicians. Working with OncoTracker to understand the many stages of cancer treatment, I put together a site map and HTML wireframes to demonstrate how I planned to get the user from one step to the next. I broke the process down into 3 primary stages based on chronological progression:  diagnosis, treatment, and follow-up. Each stage would have multiple steps for entering specific details about that stage. Within each step, the user would be presented with a detailed description of that step''s information and a form to capture their data. Each form field also would have its own accompanying help text to assist the user in translating cryptic medical data from their paper forms into the OncoTracker interface.
</p>

<figure class="callout sitemap">
<a class="new-tab" href="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_80/jaysylvester.com/case-studies/OncoTracker/oncotracker-sitemap.png" target="_blank" title="Open this image in a new tab">
  <noscript>
    <img src="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_50,w_500/jaysylvester.com/case-studies/OncoTracker/oncotracker-sitemap.png" alt="An image of the OncoTracker sitemap">
  </noscript>
  <img data-src="https://res.cloudinary.com/tehinnernets/image/upload/[parameters]/jaysylvester.com/case-studies/OncoTracker/oncotracker-sitemap.png" alt="An image of the OncoTracker sitemap">
</a>
<figcaption>The OncoTracker sitemap (OmniGraffle)</figcaption>
</figure>

<p>
Because entering such large amounts of data can be a time-consuming process, the user would be able to stop at any time, save their progress, and pick up where they left off later. Users also would be free to jump from step to step, skipping any step along the way that didn''t apply to their treatment records. Each step in a particular treatment cycle would present the number of records stored for that step and allow the user to edit those records or create additional records.
</p>
<p>
The final product was an easy-to-use interface that allowed oncology patients with a lot on their minds to spend less time worrying about their medical records and more time focusing on their health.
</p>', 5 );

insert into screens
( company, url, alt, category, sort )
values
( 'OncoTracker', 'OncoTracker-home.jpg', 'OncoTracker home page', 'OncoTracker screenshots', 36 ),
( 'OncoTracker', 'OncoTracker-overview.jpg', 'OncoTracker treatment overview', 'OncoTracker screenshots', 37 ),
( 'OncoTracker', 'OncoTracker-pathology.jpg', 'OncoTracker pathology report entry screen', 'OncoTracker screenshots', 38 ),
( 'OncoTracker', 'OncoTracker-profile.jpg', 'OncoTracker profile overview', 'OncoTracker screenshots', 39 );


insert into case_studies
( company_name, company_url, title, tagline, vertical, platform, expertise, summary, content, sort )
values
( 'Fitly', 'Fitly', 'Fitly Online Store', 'Making it easy for busy families to plan and prepare healthy, delicious meals', 'E-commerce', 'Responsive Web', 'UX Design / UI Architecture / Front End Development', 'Fitly approached me with an e-commerce site that had some UX challenges stemming from its startup incubator roots and a complex pricing model. I was tasked with improving the user experience and rebuilding the responsive front end to reach MVP (Minimum Viable Product) status.', '
<p>
Fitly was my first experience with a startup. When I came on board, the existing product was the result of a startup incubator, and it was about what you would expect considering its origins: good at demonstrating the concept&mdash;choose healthy, delicious recipes and have their ingredients delivered fresh to your door&mdash;but troubled in its execution. There were significant e-commerce usability problems including unclear pricing and a confusing checkout process, and while the bootstrapped front end architecture was responsive, it was buggy. We had a small team, big ideas, and not a lot of time before launch.
</p>
<h3>
Design Challenges
</h3>
<p>
We wanted to remain tightly focused and include only what we needed for an MVP, but there were still hard requirements that had to be met based on business needs and technical feasibility. Having worked on a number of e-commerce sites before, I knew much of the UX design would be straightforward, but there were a few requirements that made Fitly unique:
</p>
<ul>
<li>
  Our service would only be available to select zip codes at launch, so users outside those zip codes shouldn''t be allowed to place orders
</li>
<li>
  Paying customers needed easy access to the recipe preparation instructions in the kitchen, but we didn''t have time or money to provide printed recipe cards with each order like our competitors
</li>
<li>
  Recipes would have a tiered pricing structure based on the quantity (number of servings) purchased, so the price would change based on the number of items in the user''s shopping cart
</li>
</ul>
<h3>
Mobile First and Lean UX
</h3>
<p>
Given the tight deadline, I decided that we''d produce wireframes for mobile only and then design in the browser from there, getting buy-in from the team as we went. I believed this approach would work well with my plan to follow a mobile first design process; mobile wireframes would demonstrate all functionality to the team, which would be enough to get their approval on functional concerns and give the back end developers what they needed to perform their work.
</p>

<figure class="callout sitemap">
<a class="new-tab" href="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_80/jaysylvester.com/case-studies/Fitly/fitly-sitemap.png" target="_blank" title="Open this image in a new tab">
  <noscript>
    <img src="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_50,w_500/jaysylvester.com/case-studies/Fitly/fitly-sitemap.png" alt="An image of the Fitly sitemap">
  </noscript>
  <img data-src="https://res.cloudinary.com/tehinnernets/image/upload/[parameters]/jaysylvester.com/case-studies/Fitly/fitly-sitemap.png" alt="An image of the Fitly sitemap">
</a>
<figcaption>Fitly MVP sitemap and user task flow</figcaption>
</figure>

<p>
During the design process, the team met Monday, Wednesday, and Friday to review the wireframes as a group and provide feedback. We iterated quickly and dealt with unexpected challenges on the fly. Requirements frequently changed midstream, but with only mobile wireframes to maintain, I was able to keep up with these changes.
</p>
<p>
While a true Lean UX approach would probably call for even fewer formal wireframes, I still consider our approach fairly lean because I only produced wireframes for mobile devices and they were virtually unannotated. We had no written requirements whatsoever from the stakeholders, so I felt it was necessary to codify certain requirements and get sign-off from all parties. I also wanted to provide at least a minimum technical specification for the back end developers to reference while programming.
</p>

<figure class="callout wireframes">
<a class="new-tab" href="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_80/jaysylvester.com/case-studies/Fitly/fitly-wireframes.png" target="_blank" title="Open this image in a new tab">
  <noscript>
    <img src="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_50,w_500/jaysylvester.com/case-studies/Fitly/fitly-wireframes.png" alt="A thumbnail of my Fitly wireframes">
  </noscript>
  <img data-src="https://res.cloudinary.com/tehinnernets/image/upload/[parameters]/jaysylvester.com/case-studies/Fitly/fitly-wireframes.png" alt="A thumbnail of my Fitly wireframes">
</a>
<figcaption>Fitly mobile wireframes (checkout, delivery info)</figcaption>
</figure>

<h3>
UX Challenge #1: Delivery Zones
</h3>
<p>
With the Fitly service only available to select zip codes at launch, we had to make sure that users outside those delivery areas weren''t able to place orders. During account creation, users had to provide their zip code, so users who were logged in didn''t present a problem, but anonymous visitors did. The initial solutions requested by the stakeholders were to require an account to access recipes or block the public from accessing any recipes without first providing their zip code. This also aligned with the stakeholders'' desire to protect the recipe content.
</p>
<p>
I recommended against requiring an account simply to view our product due to the friction that would add to the experience. I felt Fitly''s value proposition lie not with the recipes, but with the easy meal planning and grocery delivery. I also knew we would miss out on SEO benefits if we prevented search engines from indexing our recipe content. However, I didn''t want users outside our delivery area adding items to their cart and getting all the way to checkout only to turn them away once we checked their zip code.
</p>
<p>
I proposed we open our recipes to the public and simply add a zip code field above the &quot;add to cart&quot; button on the recipe detail page with a note explaining why we were asking for it. If the user''s zip code were in our service area, we''d add the item to their cart and set a cookie so we''d know they were in a valid delivery area. The zip code field would be hidden for that user from then on, and we wouldn''t ask them to create an account until they entered the checkout process. If we didn''t deliver to their zip code, we''d forward them to our newsletter signup form to collect their e-mail address and notify them when Fitly became available.
</p>

<figure class="callout zip-code">
<a class="new-tab" href="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_80/jaysylvester.com/case-studies/Fitly/fitly-zip-code-verification.jpg" target="_blank" title="Open this image in a new tab">
  <noscript>
    <img src="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_50,w_500/jaysylvester.com/case-studies/Fitly/fitly-zip-code-verification.jpg" alt="A thumbnail of the Fitly zip code verification field">
  </noscript>
  <img data-src="https://res.cloudinary.com/tehinnernets/image/upload/[parameters]/jaysylvester.com/case-studies/Fitly/fitly-zip-code-verification.jpg" alt="A thumbnail of the Fitly zip code verification field">
</a>
<figcaption>We avoided a pile of additional requested functionality and a negative user experience by adding one extra field.</figcaption>
</figure>

<h3>
UX Challenge #2: Preparation Instructions
</h3>
<p>
Fitly''s competitors had been on the scene for significantly longer than we had, giving them more time to solve certain logistical problems and obtain significant funding. One of the nice aspects of their experience was the inclusion of printed recipe cards with each grocery delivery. When the customer received their groceries, they also received a printed set of cards with the ingredient list and preparation instructions. We had neither the time nor the funds to do the same for launch, so I had to come up with a solution to get us by.
</p>
<p>
During our user research, we discovered that people sometimes use a tablet or laptop in the kitchen. It wasn''t always necessarily for cooking, but the fact that tablets and laptops have become so ubiquitous that they make appearances in the kitchen was interesting to me.
</p>
<p>
If we couldn''t provide printed cards, I thought perhaps we could extend the functionality of the recipe detail page to function as a &quot;Kitchen View&quot;&mdash;ingredient lists and preparation instructions presented in big font sizes that would be easier to read from a distance and easier to interact with during the sometimes chaotic act of preparing the family meal. I designed the Kitchen View to make use of the same content present on the recipe detail page, but stripped down and increased in size using only JavaScript and CSS.
</p>

<figure class="callout device kitchen-view">
<a class="new-tab" href="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_80/jaysylvester.com/case-studies/Fitly/fitly-kitchen-view.jpg" target="_blank" title="Open this image in a new tab">
  <noscript>
    <img src="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_50,w_500/jaysylvester.com/case-studies/Fitly/fitly-kitchen-view.jpg" alt="A thumbnail of the Fitly recipe kitchen view">
  </noscript>
  <img data-src="https://res.cloudinary.com/tehinnernets/image/upload/[parameters]/jaysylvester.com/case-studies/Fitly/fitly-kitchen-view.jpg" alt="A thumbnail of the Fitly recipe kitchen view">
</a>
<figcaption>A printed recipe card isn''t necessary thanks to the easy-to-read Kitchen View.</figcaption>
</figure>

<h3>
UX Challenge #3: Pricing
</h3>
<p>
Fitly''s pricing model was complex compared to our competitors, who offered simple pricing based on a flat cost per meal (2 servings for $15, for example). We had a tiered pricing model based on the number of servings purchased with a minimum order size of 8 servings. Recipes started at $7.99 per serving, but dropped to $6.99 at 12 servings and $5.99 at 20 servings. Unlike a typical e-commerce site, we couldn''t simply display a price alongside each item because the price would change based on the number of servings in the user''s shopping cart, potentially confusing them. We also couldn''t embed the entire pricing story in every page because it was too lengthy.
</p>
<p>
I figured that clear and consistent messaging throughout the shopping path was the best way to tell the pricing story, so I incorporated a pricing story CTA in a standout color and placed it on pages that contained product information. Clicking on the CTA would display the larger pricing story within the context of the current page. I also turned the tiered pricing into an upsell strategy within the shopping cart by including messaging that told the user how much they could save if they added more servings to their cart.
</p>

<figure role="group" class="callout pricing-cta">
<figure>
<a class="new-tab" href="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_80/jaysylvester.com/case-studies/Fitly/fitly-pricing-cta-1.jpg" target="_blank" title="Open this image in a new tab">
  <noscript>
    <img src="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_50,w_500/jaysylvester.com/case-studies/Fitly/fitly-pricing-cta-1.jpg" alt="A thumbnail of the Fitly pricing story">
  </noscript>
  <img data-src="https://res.cloudinary.com/tehinnernets/image/upload/[parameters]/jaysylvester.com/case-studies/Fitly/fitly-pricing-cta-1.jpg" alt="A thumbnail of the Fitly pricing story">
</a>
</figure>
<figure>
<a class="new-tab" href="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_80/jaysylvester.com/case-studies/Fitly/fitly-pricing-cta-2.jpg" target="_blank" title="Open this image in a new tab">
  <noscript>
    <img src="https://res.cloudinary.com/tehinnernets/image/upload/f_auto,q_50,w_500/jaysylvester.com/case-studies/Fitly/fitly-pricing-cta-2.jpg" alt="A thumbnail of the Fitly pricing story">
  </noscript>
  <img data-src="https://res.cloudinary.com/tehinnernets/image/upload/[parameters]/jaysylvester.com/case-studies/Fitly/fitly-pricing-cta-2.jpg" alt="A thumbnail of the Fitly pricing story">
</a>
</figure>
<figcaption>The prominent orange CTA, which is visually consistent across all product pages, helps convey the story of a complex and potentially confusing pricing model.</figcaption>
</figure>

<p>
Designing the Fitly experience proved to be an interesting challenge not just because of our lofty goals and tight timeline, but because it had some quirks that set it apart from the typical e-commerce formula. Check out the work samples below for additional design comps.
</p>', 2 );

insert into screens
( company, url, alt, category, sort )
values
( 'Fitly', 'Fitly-recipe-detail-mobile.jpg', 'Fitly recipe detail page (mobile)', 'Fitly v2.0 online store', 17 ),
( 'Fitly', 'Fitly-recipe-detail-tablet.jpg', 'Fitly recipe detail page (tablet)', 'Fitly v2.0 online store', 18 ),
( 'Fitly', 'Fitly-recipe-detail-desktop.jpg', 'Fitly recipe detail page (desktop)', 'Fitly v2.0 online store', 19 ),
( 'Fitly', 'Fitly-kitchen-view-tablet.jpg', 'Fitly kitchen view (tablet)', 'Fitly v2.0 online store', 20 ),
( 'Fitly', 'Fitly-recipe-search-mobile.jpg', 'Fitly recipe search page (mobile)', 'Fitly v2.0 online store', 21 ),
( 'Fitly', 'Fitly-recipe-search-tablet.jpg', 'Fitly recipe search page (tablet)', 'Fitly v2.0 online store', 22 ),
( 'Fitly', 'Fitly-recipe-search-desktop.jpg', 'Fitly recipe search page (desktop)', 'Fitly v2.0 online store', 23 );
