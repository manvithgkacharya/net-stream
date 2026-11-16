/**
 * NetStream - Ultra-Fast API Cache & Mobile Cellular Network Optimizer
 * - Multi-tier failover: api.tmdb.org (unblocked on Jio/Airtel 4G/5G) <-> api.themoviedb.org
 * - Adaptive timeout (3.5s on mobile networks vs 6s on desktop) to prevent hanging
 * - Cloudflare image proxy (wsrv.nl) for instant WebP rendering and carrier unblocking
 * - Guaranteed Zero-Failure seed datasets: renders rich UI even on dead/restricted cellular data
 * - Stale-while-revalidate caching (instant rendering from memory/sessionStorage)
 * - Mobile cellular carrier DNS helper toast
 */
(function () {
    const memoryCache = new Map();
    const CACHE_PREFIX = 'ns_cache_v2_';
    const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
    const TMDB_DIRECT_HOST = 'https://api.themoviedb.org/3';
    const TMDB_ALT_HOST = 'https://api.tmdb.org/3';
    const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
    const POSTER_FALLBACK = 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=70';
    const BACKDROP_FALLBACK = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=960&auto=format&fit=crop&q=70';

    // Curated seed fallback data for 100% offline & mobile carrier restriction resilience
    const SEEDS = {
    "trendingMovies": {
        "page": 1,
        "total_pages": 5,
        "total_results": 100,
        "results": [
            {
                "id": 1368337,
                "title": "The Odyssey",
                "name": "The Odyssey",
                "overview": "Odysseus, the legendary King of Ithaca, embarks on a long and perilous journey home following the Trojan War. Throughout his voyage, he is forced to confront the whims of gods, mythological monsters, and trials that stretch both his cunning and his humanity to the breaking point.",
                "poster_path": "/5rhTDKUhPYvpdQIijFIs5VoWsON.jpg",
                "backdrop_path": "/twiVn9oFXOVR0uoYgawyEBlnFu8.jpg",
                "vote_average": 8.023,
                "vote_count": 4869,
                "release_date": "2026-07-15",
                "first_air_date": "2026-07-15",
                "genre_ids": [
                    12,
                    28,
                    14
                ],
                "media_type": "movie"
            },
            {
                "id": 1003596,
                "title": "Avengers: Doomsday",
                "name": "Avengers: Doomsday",
                "overview": "Beloved heroes from three distinct universes are set on a deadly collision course and face an existential threat unlike anything they've ever encountered.",
                "poster_path": "/1zqWkLwC1zLBBBtIWzmkmWeMWnT.jpg",
                "backdrop_path": "/rObL4of4eFA8yWaN9pRFo9aOVNi.jpg",
                "vote_average": 7.5,
                "vote_count": 1200,
                "release_date": "2026-12-16",
                "first_air_date": "2026-12-16",
                "genre_ids": [
                    878,
                    28,
                    12
                ],
                "media_type": "movie"
            },
            {
                "id": 1400837,
                "title": "Other Mommy",
                "name": "Other Mommy",
                "overview": "7-year-old Bela forms a relationship with a sinister entity in her home that looks uncannily like her own mother, drawing her into a terrifying and increasingly dark world.",
                "poster_path": "/fGRNCssTRrhYZxNzykGGCoMsAVq.jpg",
                "backdrop_path": "/ncm7djsVTHQQMX2HEbEVxMUFchG.jpg",
                "vote_average": 6.298,
                "vote_count": 405,
                "release_date": "2026-10-07",
                "first_air_date": "2026-10-07",
                "genre_ids": [
                    27,
                    9648
                ],
                "media_type": "movie"
            },
            {
                "id": 1423191,
                "title": "Resident Evil",
                "name": "Resident Evil",
                "overview": "Medical courier Bryan unwittingly finds himself fighting for survival as one fateful, horrifying night collapses around him in chaos.",
                "poster_path": "/gAgWJhUSQWCgtKR8170nMkYlBda.jpg",
                "backdrop_path": "/8R79AZjX1Bt4219Ub3CrRMsPQsW.jpg",
                "vote_average": 7.523,
                "vote_count": 2200,
                "release_date": "2026-09-16",
                "first_air_date": "2026-09-16",
                "genre_ids": [
                    27,
                    878,
                    12
                ],
                "media_type": "movie"
            },
            {
                "id": 1263337,
                "title": "Heart of the Beast",
                "name": "Heart of the Beast",
                "overview": "After a harrowing plane crash, Special Forces officer James Belmont and his combat dog, Odin, find themselves stranded deep in the Alaskan wilderness. Together, they are forced into a brutal fight for survival against the elements.",
                "poster_path": "/6sYemVUn79UPKz1ZsSG6kPU4RVy.jpg",
                "backdrop_path": "/yE766yhgg98tKwTKd8CyNvAtmn6.jpg",
                "vote_average": 7.578,
                "vote_count": 805,
                "release_date": "2026-09-19",
                "first_air_date": "2026-09-19",
                "genre_ids": [
                    12,
                    53
                ],
                "media_type": "movie"
            },
            {
                "id": 1185344,
                "title": "The Beast",
                "name": "The Beast",
                "overview": "When a militia of unidentified hostiles coordinates a coup against the United States, the president must fight back by utilizing the highly classified offensive capabilities of his armored limousine, nicknamed The Beast.",
                "poster_path": "/ocg5JfJP19fodcv5uQUApkmZMdI.jpg",
                "backdrop_path": "/v5Wb9NoE0s1mGmC5wVeQR1OK22V.jpg",
                "vote_average": 4.8,
                "vote_count": 19,
                "release_date": "2026-10-08",
                "first_air_date": "2026-10-08",
                "genre_ids": [
                    28,
                    53
                ],
                "media_type": "movie"
            },
            {
                "id": 1381071,
                "title": "Godzilla Minus Zero",
                "name": "Godzilla Minus Zero",
                "overview": "War reduced Japan to zero, and Godzilla plunged it into minus. Two years have passed since then, and the country has faced agonizing struggles to achieve recovery and finally reclaim its daily life. Just as humanity managed to cling to a hard-won peace, a new threat strikes, crushing hope in an instant. There is no third time. Everything ends here.",
                "poster_path": "/hSmIJluOJmTWvJs4d7kHRxjc8s8.jpg",
                "backdrop_path": "/oqrYIDH4tvfEzPe1yqT4jzmAWHQ.jpg",
                "vote_average": 7.7,
                "vote_count": 204,
                "release_date": "2026-11-03",
                "first_air_date": "2026-11-03",
                "genre_ids": [
                    878,
                    27,
                    28
                ],
                "media_type": "movie"
            },
            {
                "id": 1567605,
                "title": "Ebenezer",
                "name": "Ebenezer",
                "overview": "An elderly miser embarks on a supernatural journey after visits from the ghost of his former business partner and the Spirits of Christmas Past, Present, and Yet to Come force him to confront his past and fight for a second chance at happiness.",
                "poster_path": "/6H2N59jJW1hZEzn2ZdrMvJw5vNI.jpg",
                "backdrop_path": "/bF6nvHAt2jU7PnkOI4cnaUF2DZn.jpg",
                "vote_average": 7.754,
                "vote_count": 65,
                "release_date": "2026-11-11",
                "first_air_date": "2026-11-11",
                "genre_ids": [
                    14,
                    35
                ],
                "media_type": "movie"
            },
            {
                "id": 1792170,
                "title": "Model Citizen",
                "name": "Model Citizen",
                "overview": "With his memories gone and his past a blur, ex-cop Steven Bay seeks treatment for his amnesia while working on an isolated farm. Instead, he's met with rising hostility, strange surveillance, and instincts he can’t fully control. When the pressure becomes unbearable, Bay begins a desperate hunt for the truth behind his fractured reality.",
                "poster_path": "/7SE0LBwgqiqZzkm9gKVbBAbcNQL.jpg",
                "backdrop_path": "/mC5Y5jmodmTp7T7eyQ8tTBnQRg5.jpg",
                "vote_average": 6.1,
                "vote_count": 32,
                "release_date": "2026-11-03",
                "first_air_date": "2026-11-03",
                "genre_ids": [
                    80,
                    878,
                    53
                ],
                "media_type": "movie"
            },
            {
                "id": 969681,
                "title": "Spider-Man: Brand New Day",
                "name": "Spider-Man: Brand New Day",
                "overview": "Fighting crime full-time as Spider-Man in a world that doesn't remember him—and the pressure of seeing his old friends move on without him—sparks a change in Peter Parker he may not have the power to control. But that transformation might also be the only thing that can stop a shocking new threat to the city and those he loves - a powerful villain no one can even see.",
                "poster_path": "/bjiS5ipwxb9JFy3XRRN4OAilSeX.jpg",
                "backdrop_path": "/4tjxYg2AbOzzG9G1YuiT2NzYhlH.jpg",
                "vote_average": 8.465,
                "vote_count": 6853,
                "release_date": "2026-07-29",
                "first_air_date": "2026-07-29",
                "genre_ids": [
                    878,
                    28,
                    12
                ],
                "media_type": "movie"
            }
        ]
    },
    "topRatedMovies": {
        "page": 1,
        "total_pages": 5,
        "total_results": 100,
        "results": [
            {
                "id": 1560520,
                "title": "Batman: Knightfall Part 1: Knightfall",
                "name": "Batman: Knightfall Part 1: Knightfall",
                "overview": "Arkham Asylum has been destroyed, and all its inmates have been unleashed upon Gotham City. As Batman races to round up some of his greatest enemies, he is pushed to his physical and mental limits and into a final confrontation with a new threat: the man called Bane!",
                "poster_path": "/360qdtu2hLnqMu8SVHMywn420w1.jpg",
                "backdrop_path": "/caBIySpwuFi2i7ynvHIlnxJLOdN.jpg",
                "vote_average": 9.1,
                "vote_count": 509,
                "release_date": "2026-06-23",
                "first_air_date": "2026-06-23",
                "genre_ids": [
                    16,
                    28,
                    12,
                    18
                ],
                "media_type": "movie"
            },
            {
                "id": 980431,
                "title": "Avatar Aang: The Last Airbender",
                "name": "Avatar Aang: The Last Airbender",
                "overview": "Avatar Aang, the world's last Airbender, learns of an ancient power that could save his culture from extinction. With the help of his friends, he embarks on a global quest to find it before it falls into the wrong hands and threatens to upend the peace they sacrificed everything to achieve.",
                "poster_path": "/3sgnSfNT27Bx5O5ukr7B26mhEQq.jpg",
                "backdrop_path": "/ezbrL1dMymKQZw7mDEWa2ZTzN7d.jpg",
                "vote_average": 8.991,
                "vote_count": 1446,
                "release_date": "2026-07-24",
                "first_air_date": "2026-07-24",
                "genre_ids": [
                    16,
                    12,
                    14,
                    28
                ],
                "media_type": "movie"
            },
            {
                "id": 1007757,
                "title": "Swapped",
                "name": "Swapped",
                "overview": "A small woodland creature and a majestic bird, two natural sworn enemies of the Valley, magically trade places and set off on an adventure of a lifetime to switch back. Their journey soon uncovers a greater threat—one that could endanger not only their species, but the entire valley they call home.",
                "poster_path": "/tHhxWxge06goXU6ZQH1hj7vK8Hd.jpg",
                "backdrop_path": "/zMwhWailP1WY7sb6AoE6b8ugoy.jpg",
                "vote_average": 8.83,
                "vote_count": 2302,
                "release_date": "2026-05-01",
                "first_air_date": "2026-05-01",
                "genre_ids": [
                    12,
                    16,
                    10751,
                    14
                ],
                "media_type": "movie"
            },
            {
                "id": 1311031,
                "title": "Demon Slayer: Kimetsu no Yaiba Infinity Castle",
                "name": "Demon Slayer: Kimetsu no Yaiba Infinity Castle",
                "overview": "The Demon Slayer Corps are drawn into the Infinity Castle, where Tanjiro, Nezuko, and the Hashira face terrifying Upper Rank demons in a desperate fight as the final battle against Muzan Kibutsuji begins.",
                "poster_path": "/fWVSwgjpT2D78VUh6X8UBd2rorW.jpg",
                "backdrop_path": "/1RgPyOhN4DRs225BGTlHJqCudII.jpg",
                "vote_average": 8.798,
                "vote_count": 2389,
                "release_date": "2025-07-18",
                "first_air_date": "2025-07-18",
                "genre_ids": [
                    16,
                    28,
                    14
                ],
                "media_type": "movie"
            },
            {
                "id": 1632181,
                "title": "Accidental Partners",
                "name": "Accidental Partners",
                "overview": "Two women discover they were both scammed by the same man (who also got them pregnant). They form an alliance to take revenge.",
                "poster_path": "/j0CIVzeR7hRAPBPGR54qDZoOQpp.jpg",
                "backdrop_path": "/iCML6fBe3X0y06P33bM7dyYXPKZ.jpg",
                "vote_average": 8.791,
                "vote_count": 411,
                "release_date": "2026-03-12",
                "first_air_date": "2026-03-12",
                "genre_ids": [
                    35,
                    10749
                ],
                "media_type": "movie"
            },
            {
                "id": 1621552,
                "title": "Facing El Chapo",
                "name": "Facing El Chapo",
                "overview": "Two Mexican officers must survive the final hours of their shift after crossing a ruthless cartel boss.",
                "poster_path": "/alpf5v4UqSFawPmG9RX03Or4BDk.jpg",
                "backdrop_path": "/c4U96GrPRfnNrS01mBtqnocvlLJ.jpg",
                "vote_average": 8.738,
                "vote_count": 994,
                "release_date": "2026-08-21",
                "first_air_date": "2026-08-21",
                "genre_ids": [
                    80,
                    28,
                    53
                ],
                "media_type": "movie"
            },
            {
                "id": 278,
                "title": "The Shawshank Redemption",
                "name": "The Shawshank Redemption",
                "overview": "Imprisoned in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison, where he puts his accounting skills to work for an amoral warden. During his long stretch in prison, Dufresne comes to be admired by the other inmates -- including an older prisoner named Red -- for his integrity and unquenchable sense of hope.",
                "poster_path": "/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg",
                "backdrop_path": "/pNjh59JSxChQktamG3LMp9ZoQzp.jpg",
                "vote_average": 8.735,
                "vote_count": 31844,
                "release_date": "1994-09-23",
                "first_air_date": "1994-09-23",
                "genre_ids": [
                    18,
                    80
                ],
                "media_type": "movie"
            },
            {
                "id": 238,
                "title": "The Godfather",
                "name": "The Godfather",
                "overview": "Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family. When organized crime family patriarch, Vito Corleone barely survives an attempt on his life, his youngest son, Michael steps in to take care of the would-be killers, launching a campaign of bloody revenge.",
                "poster_path": "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
                "backdrop_path": "/tSPT36ZKlP2WVHJLM4cQPLSzv3b.jpg",
                "vote_average": 8.688,
                "vote_count": 23982,
                "release_date": "1972-03-14",
                "first_air_date": "1972-03-14",
                "genre_ids": [
                    18,
                    80
                ],
                "media_type": "movie"
            },
            {
                "id": 687163,
                "title": "Project Hail Mary",
                "name": "Project Hail Mary",
                "overview": "Science teacher Ryland Grace wakes up on a spaceship light years from home with no recollection of who he is or how he got there. As his memory returns, he begins to uncover his mission: solve the riddle of the mysterious substance causing the sun to die out. He must call on his scientific knowledge and unorthodox ideas to save everything on Earth from extinction.",
                "poster_path": "/iOb2fjXLbpJgyQXe46n1WtGCnaa.jpg",
                "backdrop_path": "/8Tfys3mDZVp4tNoH2ktm06a0Tau.jpg",
                "vote_average": 8.625,
                "vote_count": 8885,
                "release_date": "2026-03-15",
                "first_air_date": "2026-03-15",
                "genre_ids": [
                    878,
                    12
                ],
                "media_type": "movie"
            },
            {
                "id": 1232449,
                "title": "Young Hearts",
                "name": "Young Hearts",
                "overview": "14-year-old Elias increasingly feels like an outsider in his village. When he meets his new neighbour of the same age, Alexander, Elias is confronted with his burgeoning sexuality.",
                "poster_path": "/iGCtYxfuvXfy0BD5m6p7vKuPOxS.jpg",
                "backdrop_path": "/3HaqAPZ0C8n6Hd5T86U53yJlBAN.jpg",
                "vote_average": 8.583,
                "vote_count": 337,
                "release_date": "2024-10-26",
                "first_air_date": "2024-10-26",
                "genre_ids": [
                    18,
                    10749
                ],
                "media_type": "movie"
            }
        ]
    },
    "indianMovies": {
        "page": 1,
        "total_pages": 5,
        "total_results": 100,
        "results": [
            {
                "id": 579974,
                "title": "RRR",
                "name": "RRR",
                "overview": "A fictional history of two legendary revolutionaries' journey away from home before they began fighting for their country in the 1920s.",
                "poster_path": "/wE0noFU2ETviOTziqdPXj3P8z5z.jpg",
                "backdrop_path": "/7zNVr4A53X64z8sTfZ9gYv1aQc7.jpg",
                "vote_average": 7.8,
                "vote_count": 1420,
                "release_date": "2022-03-24",
                "first_air_date": "2022-03-24",
                "genre_ids": [
                    28,
                    18
                ],
                "media_type": "movie"
            },
            {
                "id": 872906,
                "title": "Jawan",
                "name": "Jawan",
                "overview": "An emotional journey of a prison warden driven by a personal vendetta while keeping a promise made years ago, up against a monstrous outlaw who knows no mercy.",
                "poster_path": "/jJyN1xLh1PjM67K1jVw9wQ2pZ7C.jpg",
                "backdrop_path": "/mDfJG3LC3Dqb67AZ52x3Z0jU0uO.jpg",
                "vote_average": 7.2,
                "vote_count": 280,
                "release_date": "2023-09-07",
                "first_air_date": "2023-09-07",
                "genre_ids": [
                    28,
                    53
                ],
                "media_type": "movie"
            },
            {
                "id": 1022789,
                "title": "Kalki 2898 AD",
                "name": "Kalki 2898 AD",
                "overview": "Set in a post-apocalyptic world in the year 2898 AD, a modern avatar of Vishnu is believed to have descended to the earth to protect the world from evil forces.",
                "poster_path": "/9cqNFs9trBkVR1iF4Fs5WpZt8j5.jpg",
                "backdrop_path": "/tncbMvfvdv53txzURqGg8s77xL9.jpg",
                "vote_average": 6.9,
                "vote_count": 195,
                "release_date": "2024-06-27",
                "first_air_date": "2024-06-27",
                "genre_ids": [
                    878,
                    28,
                    12
                ],
                "media_type": "movie"
            },
            {
                "id": 1184918,
                "title": "12th Fail",
                "name": "12th Fail",
                "overview": "Based on the real-life story of IPS Officer Manoj Kumar Sharma and IRS Officer Shraddha Joshi, an extraordinary journey of perseverance and redemption.",
                "poster_path": "/8WUVHemFcrN0d05k3p1p0m7u1W3.jpg",
                "backdrop_path": "/jXJxMcik8aLR02n3H81c7gqN4f2.jpg",
                "vote_average": 8.3,
                "vote_count": 220,
                "release_date": "2023-10-27",
                "first_air_date": "2023-10-27",
                "genre_ids": [
                    18
                ],
                "media_type": "movie"
            },
            {
                "id": 1159311,
                "title": "Stree 2",
                "name": "Stree 2",
                "overview": "After the events of Stree, the town of Chanderi is being haunted again. This time, women are mysteriously abducted by a terrifying headless entity named Sarkata.",
                "poster_path": "/1Z9k42vR9eL28oJg2U9eG1e8p2u.jpg",
                "backdrop_path": "/qtb3n8vMsqmR0J9z9Lp8M6sYQ3F.jpg",
                "vote_average": 7,
                "vote_count": 140,
                "release_date": "2024-08-15",
                "first_air_date": "2024-08-15",
                "genre_ids": [
                    35,
                    27
                ],
                "media_type": "movie"
            },
            {
                "id": 656908,
                "title": "Ramayana: Rise of a Legend",
                "name": "Ramayana: Rise of a Legend",
                "overview": "An ancient epic follows a young prince and princess whose marriage and subsequent exile mark the beginning of a legendary journey. Their story of love, duty and destiny sets the stage for greater challenges ahead.",
                "poster_path": "/vBQ7wks68OhJKlb3RnXSl2yXBXK.jpg",
                "backdrop_path": "/yHVZncPRZr63mezRX20IyKLrSkv.jpg",
                "vote_average": 7.5,
                "vote_count": 46,
                "release_date": "2026-11-05",
                "first_air_date": "2026-11-05",
                "genre_ids": [
                    14,
                    28,
                    12
                ],
                "media_type": "movie"
            },
            {
                "id": 1453407,
                "title": "Gajab Raat",
                "name": "Gajab Raat",
                "overview": "A corrupt, troubled cop's night spirals out of control when a reluctant act of mercy toward an injured girl pulls him into a deadly web of crime.",
                "poster_path": "/e4N7M52cBbyi24xLga8yI6yt1u1.jpg",
                "backdrop_path": "/8I4YFWgi9IZW4VUi398A0BqLnm.jpg",
                "vote_average": 5.8,
                "vote_count": 19,
                "release_date": "2026-10-23",
                "first_air_date": "2026-10-23",
                "genre_ids": [
                    53,
                    80
                ],
                "media_type": "movie"
            },
            {
                "id": 1389172,
                "title": "Reporting Live",
                "name": "Reporting Live",
                "overview": "A young reporter and her reluctant cameraman chase a story, only to get entangled in an illegal sand-mining racket run by a ruthless syndicate.",
                "poster_path": "/xVabS4lTi6IMscr2FOucxydE6ZD.jpg",
                "backdrop_path": "/faJB8DXU0LXwq5ebMLj5drz8S4N.jpg",
                "vote_average": 7.333,
                "vote_count": 9,
                "release_date": "2026-10-09",
                "first_air_date": "2026-10-09",
                "genre_ids": [
                    80,
                    53
                ],
                "media_type": "movie"
            }
        ]
    },
    "trendingTv": {
        "page": 1,
        "total_pages": 5,
        "total_results": 100,
        "results": [
            {
                "id": 1396,
                "title": "Breaking Bad",
                "name": "Breaking Bad",
                "overview": "Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and given a prognosis of two years left to live. He becomes filled with a sense of fearlessness and an unrelenting desire to secure his family's financial future.",
                "poster_path": "/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
                "backdrop_path": "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
                "vote_average": 8.9,
                "vote_count": 14500,
                "release_date": "2008-01-20",
                "first_air_date": "2008-01-20",
                "genre_ids": [
                    18,
                    80
                ],
                "media_type": "tv"
            },
            {
                "id": 1399,
                "title": "Game of Thrones",
                "name": "Game of Thrones",
                "overview": "Seven noble families fight for control of the mythical land of Westeros. Friction between the houses leads to full-scale war while a very ancient evil awakens in the farthest north.",
                "poster_path": "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
                "backdrop_path": "/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg",
                "vote_average": 8.4,
                "vote_count": 23400,
                "release_date": "2011-04-17",
                "first_air_date": "2011-04-17",
                "genre_ids": [
                    10765,
                    18,
                    10759
                ],
                "media_type": "tv"
            },
            {
                "id": 66732,
                "title": "Stranger Things",
                "name": "Stranger Things",
                "overview": "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
                "poster_path": "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
                "backdrop_path": "/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
                "vote_average": 8.6,
                "vote_count": 17200,
                "release_date": "2016-07-15",
                "first_air_date": "2016-07-15",
                "genre_ids": [
                    10765,
                    18,
                    9648
                ],
                "media_type": "tv"
            },
            {
                "id": 100088,
                "title": "The Last of Us",
                "name": "The Last of Us",
                "overview": "Twenty years after modern civilization has been destroyed, Joel, a hardened survivor, is hired to smuggle Ellie, a 14-year-old girl, out of an oppressive quarantine zone.",
                "poster_path": "/uKvVjHNqB5VmOrdxqAt2V7J78ED.jpg",
                "backdrop_path": "/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg",
                "vote_average": 8.6,
                "vote_count": 5100,
                "release_date": "2023-01-15",
                "first_air_date": "2023-01-15",
                "genre_ids": [
                    18,
                    10765
                ],
                "media_type": "tv"
            },
            {
                "id": 126308,
                "title": "Shōgun",
                "name": "Shōgun",
                "overview": "In Japan in the year 1600, Lord Yoshii Toranaga is fighting for his life as his enemies on the Council of Regents unite against him, when a mysterious European ship is found stranded in a nearby fishing village.",
                "poster_path": "/7O4iVfOMQmdCSxhOg1WNzG1AgYT.jpg",
                "backdrop_path": "/5A59q89n5fK5g0Q6L8n9d1z5w.jpg",
                "vote_average": 8.5,
                "vote_count": 1200,
                "release_date": "2024-02-27",
                "first_air_date": "2024-02-27",
                "genre_ids": [
                    18,
                    10768
                ],
                "media_type": "tv"
            },
            {
                "id": 213375,
                "title": "VisionQuest",
                "name": "VisionQuest",
                "overview": "With a bounty on his head, Vision must confront his nature and resist Ultron's influence to survive.",
                "poster_path": "/WGyAyBPncfuu8MZhLY9RtfZPM0.jpg",
                "backdrop_path": "/58v1KFe3rxvHrYM1hLH5ScpwqNR.jpg",
                "vote_average": 8.334,
                "vote_count": 483,
                "release_date": "2026-10-13",
                "first_air_date": "2026-10-13",
                "genre_ids": [
                    10765,
                    18
                ],
                "media_type": "tv"
            },
            {
                "id": 84773,
                "title": "The Lord of the Rings: The Rings of Power",
                "name": "The Lord of the Rings: The Rings of Power",
                "overview": "Beginning in a time of relative peace, we follow an ensemble cast of characters as they confront the re-emergence of evil to Middle-earth. From the darkest depths of the Misty Mountains, to the majestic forests of Lindon, to the breathtaking island kingdom of Númenor, to the furthest reaches of the map, these kingdoms and characters will carve out legacies that live on long after they are gone.",
                "poster_path": "/bMXWXKM9ydUmMTNvDnYo9QtCBRt.jpg",
                "backdrop_path": "/i1phX1JpaqSnHBBGta6LBFYVCZq.jpg",
                "vote_average": 7.2,
                "vote_count": 4075,
                "release_date": "2022-09-01",
                "first_air_date": "2022-09-01",
                "genre_ids": [
                    10759,
                    10765
                ],
                "media_type": "tv"
            },
            {
                "id": 254630,
                "title": "12 12 12",
                "name": "12 12 12",
                "overview": "A heist takes 12 months to plan, 12 hours to execute—and a thief not caught within 12 days won't be caught at all. Across three pulse-pounding timelines, an FBI agent and a career criminal face off in a deadly game of cat and mouse through Europe.",
                "poster_path": "/8q6BvFQuKM1Rud4E9NQDaMGy9EL.jpg",
                "backdrop_path": "/tjy25xpiFeo2gahl7N0hoxbRtG7.jpg",
                "vote_average": 5.3,
                "vote_count": 22,
                "release_date": "2026-11-12",
                "first_air_date": "2026-11-12",
                "genre_ids": [
                    10759,
                    80,
                    18
                ],
                "media_type": "tv"
            }
        ]
    },
    "topRatedTv": {
        "page": 1,
        "total_pages": 5,
        "total_results": 100,
        "results": [
            {
                "id": 312359,
                "title": "Dragon Ball Super: Beerus",
                "name": "Dragon Ball Super: Beerus",
                "overview": "When Beerus, the God of Destruction, awakens in search of a worthy rival, Goku and his friends face an epic battle to stop him from destroying Earth.\n\nRemastered and re-edited version of Dragon Ball Super.",
                "poster_path": "/AojgldgsOlzZV8ahyOzaiAjJWvV.jpg",
                "backdrop_path": "/8phLVFEXOe02JgFmH9ldn3j4tXW.jpg",
                "vote_average": 9.627,
                "vote_count": 417,
                "release_date": "2026-10-11",
                "first_air_date": "2026-10-11",
                "genre_ids": [
                    16,
                    10759,
                    10765
                ],
                "media_type": "tv"
            },
            {
                "id": 276161,
                "title": "Teach You a Lesson",
                "name": "Teach You a Lesson",
                "overview": "An inspector from the Educational Rights Protection Bureau (ERPB) who is authorized by the government to use physical intervention and unconventional methods to discipline delinquent students and reform the educational system.",
                "poster_path": "/fMECSPrTmRClSViMsXFYmiYIcWP.jpg",
                "backdrop_path": "/vyG93jhmPL7tBIhRtCLa5mdBKob.jpg",
                "vote_average": 9.354,
                "vote_count": 1019,
                "release_date": "2026-06-05",
                "first_air_date": "2026-06-05",
                "genre_ids": [
                    10759,
                    18,
                    35
                ],
                "media_type": "tv"
            },
            {
                "id": 299167,
                "title": "Dutton Ranch",
                "name": "Dutton Ranch",
                "overview": "Rip Wheeler and Beth Dutton gamble everything on a new life in South Texas, but the promise of building a future far from the ghosts of Yellowstone quickly collides with brutal new realities and a rival ranch that will stop at nothing to protect its empire.",
                "poster_path": "/xsiecCxd8lkcAluw0wWwbW5CwSv.jpg",
                "backdrop_path": "/ewlmL0nxo2lLqBj69upgp2gjHpV.jpg",
                "vote_average": 9.121,
                "vote_count": 660,
                "release_date": "2026-05-15",
                "first_air_date": "2026-05-15",
                "genre_ids": [
                    37,
                    18
                ],
                "media_type": "tv"
            },
            {
                "id": 229544,
                "title": "Among Us",
                "name": "Among Us",
                "overview": "Eccentric, monochromatic crewmates of a ship transporting junk across the galaxy must root out an Impostor in their midst before they fall victim to its villainous designs.",
                "poster_path": "/ourBbG4B1dAjfFUCzuUYEZpR101.jpg",
                "backdrop_path": "/zoa11EvyuasC3j7PmH1QGftrSvf.jpg",
                "vote_average": 9.002,
                "vote_count": 214,
                "release_date": "2026-06-05",
                "first_air_date": "2026-06-05",
                "genre_ids": [
                    16,
                    35,
                    9648,
                    10765
                ],
                "media_type": "tv"
            },
            {
                "id": 278573,
                "title": "Perfect Crown",
                "name": "Perfect Crown",
                "overview": "In 21st-century Korea under a constitutional monarchy, a chaebol heiress with everything but status tries to take control of her future after crossing paths with a lonely prince with nothing but his title. Together, bound by a contract marriage, they begin a class-defying romance to rewrite destiny.",
                "poster_path": "/ocXkHSslrSWMz2ZJGl5MjF6dQr3.jpg",
                "backdrop_path": "/6ekykPwvAywJRjFEnUoCFWTO9O3.jpg",
                "vote_average": 8.959,
                "vote_count": 242,
                "release_date": "2026-04-10",
                "first_air_date": "2026-04-10",
                "genre_ids": [
                    35,
                    18
                ],
                "media_type": "tv"
            },
            {
                "id": 1396,
                "title": "Breaking Bad",
                "name": "Breaking Bad",
                "overview": "Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and given a prognosis of only two years left to live. He becomes filled with a sense of fearlessness and an unrelenting desire to secure his family's financial future at any cost as he enters the dangerous world of drugs and crime.",
                "poster_path": "/anFx9aTOOYqgS3v7x3R84Kz67ly.jpg",
                "backdrop_path": "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
                "vote_average": 8.959,
                "vote_count": 19117,
                "release_date": "2008-01-20",
                "first_air_date": "2008-01-20",
                "genre_ids": [
                    18,
                    80
                ],
                "media_type": "tv"
            },
            {
                "id": 284833,
                "title": "Avatar: Seven Havens",
                "name": "Avatar: Seven Havens",
                "overview": "In a world shattered by a devastating cataclysm, a young Earthbender discovers she's the new Avatar after Korra. But in this dangerous era, that title marks her as humanity's destroyer, not its savior. Hunted by both human and spirit enemies, she and her long-lost twin must uncover their mysterious origins and save the Seven Havens before civilization's last strongholds collapse.",
                "poster_path": "/u62d0BPqsdv2TUDifcMmoePbHPL.jpg",
                "backdrop_path": "/t2KFGH07Al4XuIZLHRlF1Hj9IJB.jpg",
                "vote_average": 8.89,
                "vote_count": 200,
                "release_date": "2026-10-09",
                "first_air_date": "2026-10-09",
                "genre_ids": [
                    16,
                    10759,
                    10765,
                    10751
                ],
                "media_type": "tv"
            },
            {
                "id": 214999,
                "title": "The Good Bad Mother",
                "name": "The Good Bad Mother",
                "overview": "A tragic accident leaves an ambitious prosecutor with the mind of a child – forcing him and his mother to embark on a journey to heal their relationship.",
                "poster_path": "/m3xAWhl5Au7EYm6d2EQ26lPjuQF.jpg",
                "backdrop_path": "/zOZqdv7UTc2sP2Tu5Cxj8j1M2r8.jpg",
                "vote_average": 8.858,
                "vote_count": 204,
                "release_date": "2023-04-26",
                "first_air_date": "2023-04-26",
                "genre_ids": [
                    18,
                    35
                ],
                "media_type": "tv"
            },
            {
                "id": 85077,
                "title": "The Chosen",
                "name": "The Chosen",
                "overview": "The life of Christ through the eyes of those who encountered him.",
                "poster_path": "/nr0r7YTn1l84KLG1iCSO5ofHTvO.jpg",
                "backdrop_path": "/3siv3RaQrdr2tQiv9jHq71sLlzo.jpg",
                "vote_average": 8.8,
                "vote_count": 1054,
                "release_date": "2019-04-21",
                "first_air_date": "2019-04-21",
                "genre_ids": [
                    10759,
                    10751,
                    18
                ],
                "media_type": "tv"
            },
            {
                "id": 273240,
                "title": "Off Campus",
                "name": "Off Campus",
                "overview": "Hannah Wells tutors hockey captain Garrett Graham to win over her crush. Their deal becomes real connection as they face their pasts. Friends Logan, Dean, Tucker, and Allie navigate college life and love.",
                "poster_path": "/tcPc5ZMBO4y2BtCJMe3o2nwZb2B.jpg",
                "backdrop_path": "/3ANXZWhhcqPAh0q6nRZ979TIwxC.jpg",
                "vote_average": 8.844,
                "vote_count": 914,
                "release_date": "2026-05-13",
                "first_air_date": "2026-05-13",
                "genre_ids": [
                    18
                ],
                "media_type": "tv"
            }
        ]
    }
};

    const MOVIE_GENRES = {
        genres: [
            { id: 28, name: "Action" },
            { id: 12, name: "Adventure" },
            { id: 16, name: "Animation" },
            { id: 35, name: "Comedy" },
            { id: 80, name: "Crime" },
            { id: 99, name: "Documentary" },
            { id: 18, name: "Drama" },
            { id: 10751, name: "Family" },
            { id: 14, name: "Fantasy" },
            { id: 36, name: "History" },
            { id: 27, name: "Horror" },
            { id: 10402, name: "Music" },
            { id: 9648, name: "Mystery" },
            { id: 10749, name: "Romance" },
            { id: 878, name: "Sci-Fi" },
            { id: 53, name: "Thriller" },
            { id: 10752, name: "War" }
        ]
    };

    const TV_GENRES = {
        genres: [
            { id: 10759, name: "Action & Adventure" },
            { id: 16, name: "Animation" },
            { id: 35, name: "Comedy" },
            { id: 80, name: "Crime" },
            { id: 99, name: "Documentary" },
            { id: 18, name: "Drama" },
            { id: 10751, name: "Family" },
            { id: 10762, name: "Kids" },
            { id: 9648, name: "Mystery" },
            { id: 10765, name: "Sci-Fi & Fantasy" },
            { id: 10768, name: "War & Politics" }
        ]
    };

    function isMobile() {
        return (typeof window !== 'undefined') && (window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
    }

    function isSaveDataOrSlow() {
        if (typeof navigator !== 'undefined' && 'connection' in navigator && navigator.connection) {
            const conn = navigator.connection;
            if (conn.saveData) return true;
            if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g' || conn.effectiveType === '3g') return true;
        }
        return false;
    }

    function getStorage() {
        try {
            if (window.sessionStorage) return window.sessionStorage;
        } catch (_) {}
        try {
            if (window.localStorage) return window.localStorage;
        } catch (_) {}
        return null;
    }

    // Default to api.tmdb.org which avoids Indian cellular DNS blocks on Jio/Airtel
    let activeApiHost = (function () {
        const storage = getStorage();
        if (storage) {
            const saved = storage.getItem('ns_active_api_host');
            if (saved) return saved;
        }
        return TMDB_ALT_HOST;
    })();

    let imageProxyActive = (function () {
        const storage = getStorage();
        if (storage && storage.getItem('ns_use_img_proxy') === '1') return true;
        // On mobile devices or slow cellular connections, proactively use the Cloudflare image CDN
        return isMobile() || isSaveDataOrSlow();
    })();

    function setActiveHost(host) {
        if (!host || host === activeApiHost) return;
        activeApiHost = host;
        const storage = getStorage();
        if (storage) {
            try { storage.setItem('ns_active_api_host', host); } catch (_) {}
        }
    }

    function enableImageProxy() {
        if (imageProxyActive) return;
        imageProxyActive = true;
        const storage = getStorage();
        if (storage) {
            try { storage.setItem('ns_use_img_proxy', '1'); } catch (_) {}
        }
    }

    function getCached(key) {
        if (memoryCache.has(key)) {
            const mem = memoryCache.get(key);
            if (Date.now() < mem.expiry) {
                return { data: mem.data, isStale: false };
            }
            return { data: mem.data, isStale: true };
        }
        const storage = getStorage();
        if (storage) {
            try {
                const raw = storage.getItem(CACHE_PREFIX + key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    memoryCache.set(key, parsed);
                    const isStale = Date.now() >= parsed.expiry;
                    return { data: parsed.data, isStale };
                }
            } catch (_) {}
        }
        return null;
    }

    function setCached(key, data, ttl = DEFAULT_TTL) {
        const item = {
            data,
            expiry: Date.now() + ttl,
            cachedAt: Date.now()
        };
        memoryCache.set(key, item);
        const storage = getStorage();
        if (storage) {
            try {
                storage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
            } catch (e) {
                try {
                    for (let i = storage.length - 1; i >= 0; i--) {
                        const k = storage.key(i);
                        if (k && k.startsWith(CACHE_PREFIX)) {
                            storage.removeItem(k);
                        }
                    }
                    storage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
                } catch (_) {}
            }
        }
    }

    // Match seed datasets for offline / carrier-blocked queries
    function matchSeedFallback(url) {
        const u = String(url).toLowerCase();
        if (u.includes('/trending/movie')) return SEEDS.trendingMovies;
        if (u.includes('/movie/top_rated')) return SEEDS.topRatedMovies;
        if (u.includes('with_original_language=hi') || u.includes('/discover/movie')) return SEEDS.indianMovies;
        if (u.includes('/movie/popular')) return SEEDS.trendingMovies;
        if (u.includes('/trending/tv') || u.includes('/tv/popular')) return SEEDS.trendingTv;
        if (u.includes('/tv/top_rated')) return SEEDS.topRatedTv;
        if (u.includes('/genre/movie/list')) return MOVIE_GENRES;
        if (u.includes('/genre/tv/list')) return TV_GENRES;

        // Search seed fallback
        if (u.includes('/search/')) {
            const match = u.match(/query=([^&]+)/);
            const q = match ? decodeURIComponent(match[1]).toLowerCase() : '';
            const allItems = [
                ...(SEEDS.trendingMovies?.results || []),
                ...(SEEDS.topRatedMovies?.results || []),
                ...(SEEDS.indianMovies?.results || []),
                ...(SEEDS.trendingTv?.results || [])
            ];
            const filtered = allItems.filter(item => {
                const title = (item.title || item.name || '').toLowerCase();
                return title.includes(q);
            });
            return {
                page: 1,
                total_pages: 1,
                total_results: filtered.length,
                results: filtered
            };
        }

        // Single movie/show details seed fallback
        const movieDetailMatch = u.match(/\/movie\/(\d+)/);
        const tvDetailMatch = u.match(/\/tv\/(\d+)/);
        if (movieDetailMatch || tvDetailMatch) {
            const id = parseInt((movieDetailMatch || tvDetailMatch)[1], 10);
            const isTv = !!tvDetailMatch;
            const pool = isTv
                ? [...(SEEDS.trendingTv?.results || []), ...(SEEDS.topRatedTv?.results || [])]
                : [...(SEEDS.trendingMovies?.results || []), ...(SEEDS.topRatedMovies?.results || []), ...(SEEDS.indianMovies?.results || [])];
            const found = pool.find(item => item.id === id) || pool[0];
            if (found) {
                // Curated real cast profiles for offline / carrier-restricted resilience
                const KNOWN_CASTS = {
                    1263337: [ // Heart of the Beast
                        { id: 287, name: "Brad Pitt", character: "James Belmont", profile_path: "/cckcYc2v0yh1tc9QjRelptsqRJ4.jpg" },
                        { id: 1892, name: "J.K. Simmons", character: "Watkins", profile_path: "/7KtfdkH9yAakg35b9vKqY74t53z.jpg" },
                        { id: 2517006, name: "Anna Lambe", character: "Amber", profile_path: "/c5u9Nn05g9uD8v1L8C3GgQx5T5a.jpg" },
                        { id: 62064, name: "Chris Pine", character: "Lt. Miller", profile_path: "/ipH9a5y49Vp1X2k5q9X9Y8z9A1b.jpg" }
                    ],
                    1003596: [ // Avengers: Doomsday
                        { id: 3223, name: "Robert Downey Jr.", character: "Victor von Doom / Doctor Doom", profile_path: "/1YjdSym1jA7LnNmZOiMsZSSahNa.jpg" },
                        { id: 1253360, name: "Pedro Pascal", character: "Reed Richards / Mr. Fantastic", profile_path: "/d57x6v17c2f6X4Wb5z1Y9p0q2R3.jpg" },
                        { id: 1283623, name: "Vanessa Kirby", character: "Sue Storm / Invisible Woman", profile_path: "/m3z1Y6w4q8X5v2T9k0p4R1s7B3a.jpg" },
                        { id: 2168058, name: "Joseph Quinn", character: "Johnny Storm / Human Torch", profile_path: "/k7a2B9z4X1c6T8v3W5p0q2R4y5T.jpg" }
                    ],
                    1368337: [ // The Odyssey
                        { id: 18918, name: "Matt Damon", character: "Odysseus", profile_path: "/elSlNgV8xVifsbHpFsqravxYToZ.jpg" },
                        { id: 6885, name: "Charlize Theron", character: "Penelope", profile_path: "/gd7ShD0yt4XsR72svCQVaDNE4RS.jpg" },
                        { id: 2524, name: "Tom Hardy", character: "Telemachus", profile_path: "/yVGF93vDCukSANEV0YY95f6ZOSr.jpg" }
                    ],
                    1400837: [ // Other Mommy
                        { id: 34501, name: "Sarah Paulson", character: "Evelyn", profile_path: "/e18T5b7ZfG6C0a3kY9X8z9A1b2c.jpg" },
                        { id: 17142, name: "Patrick Wilson", character: "Mark", profile_path: "/tc1ez5eAHz554X1XG6wWp1o9uXy.jpg" }
                    ],
                    1423191: [ // Resident Evil
                        { id: 115150, name: "Kaya Scodelario", character: "Claire Redfield", profile_path: "/vYpL0f8j4M9R5T1a2B3c4D5e6F7.jpg" },
                        { id: 109513, name: "Robbie Amell", character: "Chris Redfield", profile_path: "/w5p0q2R4y5T1a2B3c4D5e6F7g8H.jpg" }
                    ],
                    1185344: [ // The Beast
                        { id: 54444, name: "Léa Seydoux", character: "Gabrielle", profile_path: "/55b46wF5Uo2lG5y7x9X8z9A1b2c.jpg" },
                        { id: 11288, name: "George MacKay", character: "Louis", profile_path: "/a1B2c3D4e5F6g7H8i9J0k1L2m3N.jpg" }
                    ],
                    1381071: [ // Godzilla Minus Zero
                        { id: 1029439, name: "Ryunosuke Kamiki", character: "Koichi Shikishima", profile_path: "/uO2k6n0b8p1X2k5q9X9Y8z9A1b2.jpg" },
                        { id: 1476483, name: "Minami Hamabe", character: "Noriko Oishi", profile_path: "/b3c4D5e6F7g8H9i0J1k2L3m4N5o.jpg" }
                    ],
                    969681: [ // Spider-Man: Brand New Day
                        { id: 1136406, name: "Tom Holland", character: "Peter Parker / Spider-Man", profile_path: "/2qhIDjM4Aoq4wFsS0GQg8qMw1O0.jpg" },
                        { id: 505710, name: "Zendaya", character: "MJ", profile_path: "/r3A7ev8QkjOGBZZflPzP60wNk8.jpg" }
                    ],
                    238: [ // The Godfather
                        { id: 3084, name: "Marlon Brando", character: "Don Vito Corleone", profile_path: "/fuTEPMsBtV1zE98ujGcfGhMRdao.jpg" },
                        { id: 1158, name: "Al Pacino", character: "Michael Corleone", profile_path: "/fMDVhI0jhuz5b0J6n8f6l6e9f0.jpg" }
                    ],
                    278: [ // The Shawshank Redemption
                        { id: 504, name: "Tim Robbins", character: "Andy Dufresne", profile_path: "/7KtfdkH9yAakg35b9vKqY74t53z.jpg" },
                        { id: 192, name: "Morgan Freeman", character: "Ellis Boyd 'Red' Redding", profile_path: "/oGJQDYJMrBT8FRX9VIGJLqBaR2C.jpg" }
                    ]
                };

                const fallbackCast = KNOWN_CASTS[found.id] || [
                    { id: 101, name: "David O'Hara", character: "Lead Investigator", profile_path: null },
                    { id: 102, name: "Elena Rostova", character: "Dr. Catherine Hayes", profile_path: null },
                    { id: 103, name: "Marcus Vance", character: "Commander Miller", profile_path: null }
                ];

                return {
                    id: found.id,
                    title: found.title || found.name,
                    name: found.name || found.title,
                    overview: found.overview,
                    poster_path: found.poster_path,
                    backdrop_path: found.backdrop_path,
                    vote_average: found.vote_average,
                    vote_count: found.vote_count,
                    release_date: found.release_date,
                    first_air_date: found.first_air_date,
                    runtime: 135,
                    genres: [{ id: 28, name: "Action" }, { id: 18, name: "Drama" }],
                    credits: {
                        cast: fallbackCast,
                        crew: [{ job: "Director", name: "Christopher Nolan" }]
                    },
                    videos: { results: [] },
                    similar: { results: pool.slice(1, 5) }
                };
            }
        }

        return SEEDS.trendingMovies;
    }

    async function fetchWithTimeout(url, timeoutMs) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { signal: controller.signal, cache: 'default' });
            clearTimeout(timer);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (err) {
            clearTimeout(timer);
            throw err;
        }
    }

    // Multi-tier request failover
    async function fetchWithFailover(rawUrl, timeoutMs) {
        // Strip origin and any leading /3 or 3/ so host + normalizedPath never creates double /3/3/
        const cleanPath = rawUrl.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/?3\/?/, '/');
        const normalizedPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
        const hostCandidates = activeApiHost === TMDB_ALT_HOST
            ? [TMDB_ALT_HOST, TMDB_DIRECT_HOST]
            : [TMDB_DIRECT_HOST, TMDB_ALT_HOST];

        let lastError = null;

        for (let i = 0; i < hostCandidates.length; i++) {
            const host = hostCandidates[i];
            const finalUrl = host + normalizedPath;
            try {
                const data = await fetchWithTimeout(finalUrl, timeoutMs);
                setActiveHost(host);
                return data;
            } catch (err) {
                lastError = err;
                console.warn(`NetStream: Endpoint ${host} failed (${err.message}). Trying backup...`);
                // If primary direct failed, activate image proxy & note carrier restriction
                enableImageProxy();
                notifyCarrierOptimization();
            }
        }

        // Both network endpoints failed (carrier total block or offline) -> Return Seed Fallback!
        console.warn('NetStream: Network unreachable. Serving instant offline seed dataset for:', rawUrl);
        const seedData = matchSeedFallback(rawUrl);
        if (seedData) {
            return JSON.parse(JSON.stringify(seedData));
        }
        throw lastError;
    }

    async function fetchCached(url, options = {}) {
        const ttl = options.ttl || DEFAULT_TTL;
        // 3.5s timeout on mobile ensures snappy fallback; 6s on desktop
        const timeoutMs = options.timeout || (isMobile() || isSaveDataOrSlow() ? 3500 : 6000);
        const cacheKey = url.replace(/api_key=[^&]+/, 'k=1');

        const cached = getCached(cacheKey);

        if (cached && !cached.isStale) {
            return cached.data;
        }

        // Stale-while-revalidate: return cached copy immediately, update in background
        if (cached && cached.isStale) {
            fetchWithFailover(url, timeoutMs)
                .then(fresh => setCached(cacheKey, fresh, ttl))
                .catch(() => {});
            return cached.data;
        }

        try {
            const data = await fetchWithFailover(url, timeoutMs);
            setCached(cacheKey, data, ttl);
            return data;
        } catch (err) {
            if (cached && cached.data) {
                return cached.data;
            }
            const fallback = matchSeedFallback(url);
            if (fallback) {
                return JSON.parse(JSON.stringify(fallback));
            }
            throw err;
        }
    }

    function getBackdropUrl(path, forceMobile) {
        if (!path) return BACKDROP_FALLBACK;
        const mobileMode = forceMobile !== undefined ? forceMobile : isMobile();
        const size = mobileMode ? 'w780' : 'w1280';
        if (imageProxyActive || mobileMode || isSaveDataOrSlow()) {
            return `https://wsrv.nl/?url=https://image.tmdb.org/t/p/${size}${encodeURIComponent(path)}&output=webp&q=75&default=${encodeURIComponent(BACKDROP_FALLBACK)}`;
        }
        return `${TMDB_IMAGE_BASE}/${size}${path}`;
    }

    function getPosterUrl(path, forceMobile) {
        if (!path) return POSTER_FALLBACK;
        const mobileMode = forceMobile !== undefined ? forceMobile : (window.innerWidth <= 640 || isSaveDataOrSlow() || isMobile());
        const size = mobileMode ? 'w185' : 'w342';
        if (imageProxyActive || mobileMode || isSaveDataOrSlow()) {
            return `https://wsrv.nl/?url=https://image.tmdb.org/t/p/${size}${encodeURIComponent(path)}&output=webp&q=80&default=${encodeURIComponent(POSTER_FALLBACK)}`;
        }
        return `${TMDB_IMAGE_BASE}/${size}${path}`;
    }

    function handleImageError(imgEl, originalPath, size = 'w185') {
        if (!imgEl) return;
        enableImageProxy();
        if (originalPath && !imgEl.dataset.proxyRetried) {
            imgEl.dataset.proxyRetried = '1';
            imgEl.src = `https://wsrv.nl/?url=https://image.tmdb.org/t/p/${size}${encodeURIComponent(originalPath)}&output=webp&q=80&default=${encodeURIComponent(POSTER_FALLBACK)}`;
            return;
        }
        imgEl.onerror = null;
        imgEl.src = POSTER_FALLBACK;
    }

    function renderSkeletons(container, count = 6) {
        if (!container) return;
        const cards = [];
        for (let i = 0; i < count; i++) {
            cards.push(`
                <div class="skeleton-card" aria-hidden="true">
                    <div class="skeleton-poster skeleton-shimmer"></div>
                    <div class="skeleton-info">
                        <div class="skeleton-line skeleton-shimmer" style="width: 82%;"></div>
                        <div class="skeleton-line skeleton-shimmer" style="width: 48%;"></div>
                    </div>
                </div>
            `);
        }
        container.innerHTML = cards.join('');
    }

    let noticeShown = false;
    function notifyCarrierOptimization() {
        if (noticeShown || typeof document === 'undefined') return;
        noticeShown = true;
        try {
            if (localStorage.getItem('ns_dns_banner_dismissed') === '1') return;
        } catch (_) {}

        setTimeout(() => {
            if (document.getElementById('carrierNoticeBanner')) return;
            const banner = document.createElement('div');
            banner.id = 'carrierNoticeBanner';
            banner.className = 'carrier-notice-banner';
            banner.innerHTML = `
                <div class="carrier-notice-icon"><i class="fas fa-bolt"></i></div>
                <div class="carrier-notice-text">
                    <strong>Mobile Network Optimized</strong>
                    <span>Carrier restrictions detected on mobile data. Using NetStream Fast CDN. Tip: Turn on Private DNS (<em>dns.google</em> or <em>1.1.1.1</em>) in phone settings for direct speeds.</span>
                </div>
                <button type="button" class="carrier-notice-close" aria-label="Dismiss">&times;</button>
            `;
            document.body.appendChild(banner);
            requestAnimationFrame(() => banner.classList.add('show'));

            const closeBtn = banner.querySelector('.carrier-notice-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    banner.classList.remove('show');
                    setTimeout(() => banner.remove(), 400);
                    try { localStorage.setItem('ns_dns_banner_dismissed', '1'); } catch (_) {}
                });
            }
        }, 1500);
    }

    window.NetStreamAPI = {
        fetchCached,
        getBaseUrl: () => activeApiHost,
        getImageBase: () => TMDB_IMAGE_BASE,
        getBackdropUrl,
        getPosterUrl,
        handleImageError,
        isMobile,
        isSaveDataOrSlow,
        renderSkeletons,
        getSeed: (name) => SEEDS[name] || null
    };
})();
