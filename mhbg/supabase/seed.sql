-- =====================================================================
-- Real MHBG content: conference, contact details, testimonies, gallery.
-- Run AFTER schema.sql. Safe to run more than once (skips what exists).
-- =====================================================================

-- Contact details (only fills fields that are still empty)
update public.site_settings set
  whatsapp_number = coalesce(whatsapp_number, '+234 812 997 1991'),
  phone           = coalesce(phone, '+234 812 997 1991'),
  contact_email   = coalesce(contact_email, 'marvellouslyhelpedbygod@gmail.com'),
  instagram_url   = coalesce(instagram_url, 'https://www.instagram.com/marvellouslyhelpedbygod')
where id = 1;

-- 2027 conference (only if no conference exists yet)
insert into public.conferences (title, theme, tagline, event_date, venue, description, why_title, why_body, categories, checkin_mode, registration_open)
select '2027 Conference: Back to Eden', 'Back to Eden',
  $q$Life as God intended. Our annual gathering where we pause together to rediscover God's original design for our lives.$q$,
  '2027-02-27',
  'Ibadan Business School, 70 Francis Okediji Street, Off Awolowo, Old Bodija, Ibadan, Nigeria',
  $q$Life as God intended. Join us as we unlearn what limits us, embrace our God-given identity, and return to the original blueprint for how we were meant to live.$q$,
  'Back to Eden — Life as God Intended',
  $q$At the heart of Marvellously Helped by God is a desire to raise people who know who they are, walk the earth in dominion, and make meaningful impact. But to live this way, we must first understand God's original design for our lives.

Too many of us have accepted limiting beliefs, ideologies and definitions of what is possible, without questioning whether they align with what God intended from the beginning.

Back to Eden is an invitation to rediscover that original design — to unlearn what limits us, embrace our God-given identity, and begin to see the extraordinary possibilities available to those who understand who they are in God.

Because we cannot fully live the life God intended while holding on to beliefs that contradict His intentions. It is time to return to the original blueprint and live as God intended.$q$,
  array['Participant'], 'both', true
where not exists (select 1 from public.conferences);

-- Testimonies from the 2026 feedback form (already approved)
insert into public.testimonies (name, location, title, body, status, created_at, approved_at)
select v.name, v.location, v.title, v.body, 'approved', v.ts::timestamptz, v.ts::timestamptz
from (values
  ($q$Mercy Olawunmi Adekunle$q$, null, $q$My spirit was lifted$q$, $q$It was my first time joining, and my heart was full of so many things — but after the programme, my spirit was lifted.$q$, '2026-10-25T10:33:44.000Z'),
  ($q$Anonymous$q$, null, $q$A purpose bigger than myself$q$, $q$I am deriving purpose for existence from this vision, "Marvellously Helped by God." The life I have is far beyond just me.$q$, '2026-10-26T06:54:06.000Z'),
  ($q$David Adeniji$q$, null, $q$Connections that will do greater things together$q$, $q$I love that I was able to connect with people, and till now we still talk — I believe we'll do greater things together. I also got the urge, from the preacher, not to give up on the road to success. Although it might be challenging, do not give up — bring your God-given identity to its accomplishment in every pursuit of life.$q$, '2026-10-26T12:38:14.000Z'),
  ($q$Kwesike Nkwachukwu Nuria$q$, null, $q$Doors only God could open$q$, $q$The places I have entered within the space of one month, I can hardly believe it — I'm just talking about the people I've met, dignitaries I now get to talk with. We're still trusting God for those meetings to materialise, but it can only be God.$q$, '2026-10-26T14:19:33.000Z'),
  ($q$Anonymous$q$, null, $q$An answered prayer$q$, $q$I won one of the prizes at MHBG — an answered prayer!$q$, '2026-10-27T09:02:17.000Z'),
  ($q$Anonymous$q$, null, $q$Right people, right time$q$, $q$The speakers did excellently well, and during the networking time I connected with the right set of people.$q$, '2026-10-27T09:06:22.000Z'),
  ($q$Ihemujieto Esther Chiamaka$q$, null, $q$Encouraged to keep learning$q$, $q$MHBG has encouraged me to continue my education — I attended the second edition and watched the Goal Series.$q$, '2026-10-30T10:49:02.000Z'),
  ($q$Anonymous$q$, null, $q$Believing again$q$, $q$Having the opportunity to believe again in what God has been speaking on.$q$, '2026-10-30T19:36:45.000Z'),
  ($q$Anonymous$q$, null, $q$Making progress$q$, $q$God has indeed done me well. I am making progress.$q$, '2026-10-31T12:10:45.000Z'),
  ($q$Anonymous$q$, null, $q$Learning to do things differently$q$, $q$I remember crying when I got home that evening — I had tears in my eyes during the programme and couldn't hold it in once I got home. My testimony is: I'm learning to do things differently — to love myself more, to meet people and communicate confidently, to grow intentionally and live without fear. I realised that keeping my peace could mean holding back, so I'm more determined to grow beyond my cage.$q$, '2026-10-31T18:23:35.000Z'),
  ($q$Anonymous$q$, null, $q$Boldness, in full$q$, $q$Yes — I gained my boldness in full.$q$, '2026-11-01T04:47:28.000Z'),
  ($q$Anonymous$q$, null, $q$Clarity on who I am$q$, $q$I got clarity on who I truly am, and how I can do great things from that point of reality.$q$, '2026-11-01T10:35:17.000Z'),
  ($q$Anonymous$q$, null, $q$What I needed, right on time$q$, $q$The theme and the message of our identity in Christ was exactly what I needed at that time.$q$, '2026-11-01T19:16:42.000Z'),
  ($q$Bisola Adams$q$, null, $q$Blessed, and grateful friends$q$, $q$I was very blessed and more enlightened about who I am. Apart from that, two people I invited were very grateful that I invited them.$q$, '2026-11-02T09:40:14.000Z'),
  ($q$Elizabeth$q$, null, $q$From tears to answers$q$, $q$Thank God for the programme — a day before, I was crying, not knowing my direction, with low self-esteem. It was as if life should just end. But thank God for the programme — I got the answer to my question.$q$, '2026-11-02T18:39:53.000Z'),
  ($q$Olatunde Adegbola$q$, null, $q$Putting the laptop to good use$q$, $q$Testimony at the next event — work in progress (smiles). For now, I'm putting the laptop I won to good use.$q$, '2026-11-02T20:28:29.000Z'),
  ($q$Anonymous$q$, null, $q$Confirmation and courage$q$, $q$I got confirmation on an instruction God has been giving me, and I got the courage to take action on it.$q$, '2026-11-03T07:59:44.000Z')
) as v(name, location, title, body, ts)
where not exists (select 1 from public.testimonies x where x.title = v.title and x.name = v.name);

-- Gallery: two Instagram posts and the event photos (files in public/images/gallery)
insert into public.gallery_items (instagram_url, sort_order, created_at)
select v.url, 0, v.ts::timestamptz from (values
  ('https://www.instagram.com/reel/DeKB3KKCqXz/', '2026-11-04T00:00:00Z'),
  ('https://www.instagram.com/p/DeHU-7TgrEe/',   '2026-11-04T00:00:01Z')
) as v(url, ts)
where not exists (select 1 from public.gallery_items g where g.instagram_url = v.url);

insert into public.gallery_items (image_path, width, height, sort_order, created_at)
select v.path, v.w, v.h, 0, v.ts::timestamptz from (values
  ('/images/gallery/01.jpg', 828, 498, '2026-11-05T00:00:01Z'),
  ('/images/gallery/02.jpg', 828, 498, '2026-11-05T00:00:02Z'),
  ('/images/gallery/03.jpg', 828, 498, '2026-11-05T00:00:03Z'),
  ('/images/gallery/04.jpg', 828, 498, '2026-11-05T00:00:04Z'),
  ('/images/gallery/05.jpg', 828, 498, '2026-11-05T00:00:05Z'),
  ('/images/gallery/06.jpg', 828, 430, '2026-11-05T00:00:06Z'),
  ('/images/gallery/07.jpg', 828, 430, '2026-11-05T00:00:07Z'),
  ('/images/gallery/08.jpg', 828, 430, '2026-11-05T00:00:08Z'),
  ('/images/gallery/09.jpg', 828, 835, '2026-11-05T00:00:09Z'),
  ('/images/gallery/10.jpg', 828, 835, '2026-11-05T00:00:10Z'),
  ('/images/gallery/11.jpg', 828, 835, '2026-11-05T00:00:11Z'),
  ('/images/gallery/12.jpg', 828, 835, '2026-11-05T00:00:12Z'),
  ('/images/gallery/13.jpg', 828, 835, '2026-11-05T00:00:13Z'),
  ('/images/gallery/14.jpg', 828, 835, '2026-11-05T00:00:14Z'),
  ('/images/gallery/15.jpg', 828, 835, '2026-11-05T00:00:15Z'),
  ('/images/gallery/16.jpg', 828, 833, '2026-11-05T00:00:16Z'),
  ('/images/gallery/17.jpg', 828, 833, '2026-11-05T00:00:17Z'),
  ('/images/gallery/18.jpg', 828, 833, '2026-11-05T00:00:18Z'),
  ('/images/gallery/19.jpg', 828, 833, '2026-11-05T00:00:19Z')
) as v(path, w, h, ts)
where not exists (select 1 from public.gallery_items g where g.image_path = v.path);
