/* Sentence Builder — the colour-coding auto-tagger (autoTagSentence), moved from the staff
 * Colour-Coded Sentence Builder on 10.10.26. Shared by the Teach tab (My sentence) and Check my
 * writing. Needs lib/wink-pos-tagger.bundle.js loaded first for its best results.
 */
/* ---------- Free-write auto-tagger ---------- */
// wink-pos-tagger's own statistical model mistags many common-but-less-frequent adjectives
// as nouns (e.g. "stern", "shrewd", "sombre") when they're not adjacent to a clearer cue —
// verified by testing a broad set of KS2-appropriate vocabulary outside this tool's curated
// ADJ list. Seeding its lexicon with them directly (as arrays — a bare string value gets
// silently truncated by the tagger's internal lemmatiser) fixes the large majority of these
// without needing a heavier, network-hosted tagger.
if(typeof winkPOSTagger !== 'undefined'){
  const EXTRA_ADJECTIVES = ['stern','shrewd','sombre','coarse','morose','sullen','irate','livid','wistful','pensive','prim','svelte','coy','wry','bland','keen','genial','affable','glum','vast','grim','apt','brisk','wan','sly','posh','chic','stark','bleak','dour','tame','meek','vain','smug','crude','lewd','harsh','fierce','timid','docile','placid','surly','testy','irritable','cheery','jovial','merry','somber','dreary','dismal','forlorn','desolate','barren','fertile','lush','arid','damp','humid','murky','hazy','misty','gloomy','radiant','luminous','vivid','pale','faint','dim','garish','gaudy','drab','ornate','elegant','graceful','clumsy','awkward','nimble','agile','sturdy','frail','robust','feeble','vigorous','sluggish','hasty','tardy','punctual','prompt','abrupt','gradual','tender','rough','rugged','jagged','smooth','level','uneven','steep','mild','severe','intense','subtle','obvious','evident','vague','obscure','cryptic','blunt','tactful','candid','frank','sincere','devious','cunning','crafty','naive','gullible','skeptical','wary','cautious','reckless','rash','prudent','thrifty','frugal','lavish','extravagant','modest','arrogant','haughty','conceited','gracious','courteous','civil','impolite','vulgar','refined','polished','tacky','classy','dapper','scruffy','unkempt','tidy','sloppy','meticulous','careless','diligent','industrious','idle','slothful','zealous','apathetic','indifferent','passionate','ardent','fervent','tepid','lukewarm','scorching','sweltering','frigid','balmy','temperate','volatile','stable','erratic','steady','fickle','loyal','faithful','treacherous','devoted','dedicated','half-hearted','earnest','solemn','grave','jocular','witty','droll','comical','absurd','ludicrous','bizarre','peculiar','quaint','exotic','mundane','commonplace','remarkable','notable','distinguished','renowned','illustrious','infamous','notorious','reputable','dubious','suspicious','credible','plausible','implausible','far-fetched','genuine','authentic','fake','bogus','counterfeit','legitimate'];
  const lex = {};
  EXTRA_ADJECTIVES.forEach(w => { lex[w] = ['JJ']; });
  try { winkPOSTagger.updateLexicon(lex); } catch(e) {}
}

function tokenize(str){
  // Numbers need their own alternative — without it, a bare digit run (a year like "1642",
  // a count like "12") isn't a letter sequence, isn't punctuation, and silently vanishes
  // from the token stream instead of showing up as an unrecognised word.
  const re = /[A-Za-z][A-Za-z'-]*|[0-9]+|[,.!?;]/g;
  return str.match(re) || [];
}

// Runs wink-pos-tagger once over our own token array (tagRawTokens keeps its output aligned
// 1:1 with whatever tokens we feed it, so there's no re-tokenization to fall out of sync
// with `raw`) and returns a map from index-in-`raw` to that word's Penn Treebank POS code.
// Used as a fallback signal for words our own curated lists don't recognise (any adjective
// or proper-noun the tagger knows) — our own rules still take priority where we've already
// verified them against this tool's register (e.g. "lolly", participle adjectives like
// "frightened children").
function getPosTagsFor(raw){
  const tagMap = {};
  if(typeof winkPOSTagger === 'undefined') return tagMap;
  let tagged;
  try {
    tagged = winkPOSTagger.tagRawTokens(raw);
  } catch(e) { return tagMap; }
  if(!tagged || tagged.length !== raw.length) return tagMap; // alignment safety: bail out rather than risk mis-mapped tags
  tagged.forEach((t, idx) => { tagMap[idx] = t.pos; });
  return tagMap;
}

function autoTagSentence(str){
  const raw = tokenize(str);
  const n = raw.length;
  const lower = w => w.toLowerCase();
  const posTags = getPosTagsFor(raw);
  const posOf = idx => posTags[idx] || '';
  const isProperNounTag = idx => posOf(idx)==='NNP' || posOf(idx)==='NNPS';
  // Defensive exclusion, kept from the previous tagger's known blind spot — wink-pos-tagger
  // hasn't been seen to mistag these as adjectives, but this costs nothing to keep as insurance.
  const ADJ_TAG_EXCEPT = new Set(['adult','adults','parent','parents','teacher','teachers','baby','babies','current','currents']);
  const taggerAdj = idx => posOf(idx)==='JJ' && !ADJ_TAG_EXCEPT.has(lower(raw[idx]));

  const DET = new Set(['the','a','an','this','that','these','those','his','her','their','its','my','your','our','some','any','no','every','each']);
  const COORD = new Set(['and','but','so','or','yet','for']);
  const SUBORD_MULTI = ['in order to','provided that','as soon as','as long as','even though','such that'];
  const SUBORD = new Set(['because','if','although','unless','whenever','whereas','though','supposing','as','since','while','until','before','after','when']);
  const TIME_HINT = new Set(['before','after','since','while','until','when']);
  const AUX = new Set(['is','was','are','were','am','has','have','had','be','been','being','do','does','did','might','can','could','may','must','shall','should','will','would',
    // Contracted negative auxiliaries ("don't", "isn't"...) function exactly like their
    // uncontracted form for this tagger's purposes — tagging them plain 'aux' (rather than
    // letting them fall through to the "no subject yet" default, which used to mistag them
    // as who/doing) needs no separate negation category, just recognising them here.
    'cannot',"don't","doesn't","didn't","isn't","aren't","wasn't","weren't","haven't","hasn't","hadn't","won't","can't","couldn't","shouldn't","wouldn't","mustn't","shan't","mightn't","needn't"]);
  const PREP_WHERE = new Set(['at','in','on','under','over','near','beside','behind','above','below','inside','outside','between','among','through','across','around','from','into','onto','towards','by','along','beyond','beneath','alongside','past','upon','amid','down','up','against']);
  const PREP_OTHER = new Set(['with','without','of','about','like','than','except','despite','via','per']);
  const ADV_EXTRA = new Set(['perhaps','maybe','surely','completely','probably','certainly','definitely','possibly','obviously','clearly','actually','really','totally','absolutely','quite','rather','extremely','very','soon','then','now','today','yesterday','tomorrow','later','finally','suddenly','immediately','afterwards','meanwhile','already','still','again','often','always','never','sometimes','hard','fast']);
  const ADV_EXCEPT = new Set(['family','families','only','early','friendly','lonely','lovely','silly','ugly','holy','lolly','lollies','jelly','jellies','belly','bellies','trolley','trolleys','dolly','dollies','rally','rallies','bully','bullies','gully','gullies','filly','fillies','ally','allies','butterfly','butterflies','dragonfly','dragonflies']);
  const ADJ = new Set(['happy','sad','excited','delicious','sweet','big','small','round','bright','tall','short','quick','slow','loud','quiet','gentle','careful','sudden','immediate','eager','nervous','calm','content','overwhelmed','hungry','tired','brave','kind','cruel','colourful','delightful','wonderful','amazing','terrible','huge','tiny','ancient','modern','shiny','dull','soft','hard','warm','cold','hot','fresh','old','young','beautiful','ugly','strange','curious','mysterious','clever','silly','funny','serious','proud','shy','angry','worried','confused','surprised','delighted','grumpy','cheerful','friendly','lonely','lovely','pretty','handsome','messy','tidy','neat','dirty','clean','heavy','light','strong','weak','rich','poor','busy','lazy','wild','tame','wise','foolish','honest','polite','rude','patient','impatient','ice',
    'red','blue','green','yellow','orange','purple','pink','black','white','brown','grey','gray','golden','silver','giant','enormous','massive','gigantic','miniature','sticky','fluffy','smooth','rough','bumpy','silky','furry','slimy','crunchy','squishy','spiky','prickly','noisy','silent','squeaky','screechy','fantastic','magnificent','glorious','spooky','magical','brilliant','fabulous','marvellous','super','awesome','incredible','extraordinary','splendid','dreadful','awful','horrible','nasty','disgusting','gross','yucky','square','circular','triangular','oval','curved','straight','mighty','powerful','fierce','dangerous','safe','empty','full','narrow','wide','deep','shallow','thick','thin','sharp','blunt','dark','sparkly','glittery','misty','foggy','sunny','rainy','windy','stormy','snowy','icy','frosty','chilly','freezing','boiling','scary','transparent','opaque','creepy','frightening','terrifying','tiny','little','tall','wooden','plastic','metal','glass','stone','fresh','stale','ripe','juicy','crispy','chewy','sour','bitter','salty','spicy','tasty','yummy','wet','dry','muddy','sandy','rocky','grassy','fluttering','glowing','flashing','sleepy','exhausted','bored','jealous','embarrassed','ashamed','anxious','relaxed','peaceful','furious','terrified','astonished','puzzled','determined','confident','helpful','generous','selfish','stubborn','loyal','mischievous','naughty']);
  // A bare time phrase like "this morning" or "every week" has no preposition to trigger
  // the where/when sweep above, so without this it falls through to the generic noun-phrase
  // rules and reads as "what" — these two small sets catch the common determiner+time-noun
  // combinations and route them to "when" instead.
  const TIME_PHRASE_DET = new Set(['this','that','last','next','every','each']);
  const TIME_NOUNS = new Set(['morning','afternoon','evening','night','day','week','month','year','weekend']);
  // A handful of everyday nouns this tool is likely to meet as the second half of a
  // compound subject ("apple tree", "football team") that are, in practice, never used as
  // verbs — so they're safe to treat as continuing the subject even on the rare sentence
  // where the tagger also fumbles the clause's real verb and hasLaterVerb can't confirm it.
  const SAFE_NOUN = new Set(['tree','trees','house','houses','school','schools','team','teams','officer','officers','teacher','teachers','coach','coaches','army','armies','family','families','building','buildings','garden','gardens','street','streets','river','rivers','mountain','mountains','castle','castles','village','villages','city','cities','country','countries','king','kings','queen','queens','pharaoh','pharaohs','soldier','soldiers','farmer','farmers','doctor','doctors','ship','ships','boat','boats']);
  // A real dictionary of ~6,000 English base-form verbs (MIT-licensed, from
  // wearereasonablepeople/is-verb — not a hand-guessed subset) used as a fallback
  // signal alongside the tagger's own VB tag for detecting an imperative, since the
  // tagger's own statistical model is unreliable for sentence-initial bare verbs (see
  // the comment on the detection branch below). SAFE_NOUN entries are excluded even
  // though a few of them (school, team, coach...) are technically real verbs too,
  // because this tool only ever meets them as compound-subject nouns, never as commands.
  const ENGLISH_VERBS = new Set(['abandon','abase','abate','abbreviate','abdicate','abduct','abet','abhor','abide','abjure','abnegate','abolish','abominate','abort','abound','abrade','abridge','abrogate','abscond','abseil','absent','absolve','absorb','abstain','abstract','abuse','abut','accede','accelerate','accent','accentuate','accept','access','accessorise','accessorize','acclaim','acclimate','acclimatise','acclimatize','accommodate','accompany','accomplish','accord','accost','account','accouter','accoutre','accredit','accrue','acculturate','accumulate','accuse','accustom','ace','ache','achieve','acidify','acknowledge','acquaint','acquiesce','acquire','acquit','act','action','activate','actualise','actualize','actuate','adapt','add','addle','address','adduce','adhere','adjoin','adjourn','adjudge','adjudicate','adjure','adjust','administer','admire','admit','admonish','adopt','adore','adorn','adsorb','adulterate','adumbrate','advance','advantage','advertise','advise','advocate','aerate','affect','affiliate','affirm','affix','afflict','afford','afforest','affront','age','agglomerate','aggravate','aggregate','agitate','agonise','agonize','agree','aid','ail','aim','air','airbrush','airdrop','airfreight','airlift','alarm','alert','alienate','alight','align','allay','allege','alleviate','allocate','allot','allow','alloy','allude','ally','alphabetise','alphabetize','alter','alternate','amalgamate','amass','amaze','amble','ambush','ameliorate','amend','amortise','amortize','amount','amplify','amputate','amuse','anaesthetise','anaesthetize','analyse','anchor','anesthetize','anger','angle','anglicise','anglicize','animate','anneal','annex','annihilate','annotate','announce','annoy','annul','anodise','anodize','anoint','anonymise','anonymize','answer','antagonise','antagonize','antedate','anthologise','anthologize','anticipate','ape','apologise','apologize','apostrophise','apostrophize','appal','appall','appeal','appear','appease','append','appertain','applaud','apply','appoint','apportion','appraise','appreciate','apprehend','apprentice','apprise','approach','appropriate','approve','approximate','aquaplane','arbitrate','arc','arch','archive','argue','arise','arm','arouse','arraign','arrange','array','arrest','arrive','arrogate','arse','art','articulate','ascend','ascertain','ascribe','ask','asphyxiate','aspirate','aspire','assail','assassinate','assault','assay','assemble','assent','assert','assess','assign','assimilate','assist','associate','assuage','assume','assure','asterisk','astonish','astound','atomise','atomize','atone','atrophy','attach','attack','attain','attempt','attend','attenuate','attest','attract','attribute','auction','audit','audition','augment','augur','authenticate','author','authorise','authorize','autograph','automate','autosave','autowind','avail','avenge','aver','average','avert','avoid','avow','await','awake','awaken','award','awe','ax','axe','baa','babble','baby','babysit','back','backcomb','backdate','backfill','backfire','backlight','backpack','backspace','backtrack','badger','baffle','bag','bail','bait','bake','balance','bale','ball','balloon','ballot','balls','bamboozle','ban','band','bandage','bandy','bang','bangs','banish','bank','bankroll','bankrupt','banter','baptise','baptize','bar','barbecue','bare','barf','bargain','barge','bark','barnstorm','barrack','barrel','barricade','barter','base','bash','bask','bastardise','bastardize','baste','bat','batch','bath','bathe','batten','batter','battle','baulk','bawl','bay','bayonet','be','beach','beam','bean','bear','beard','beat','beatbox','beatboxer','beatify','beautify','beaver','beckon','become','bed','bedazzle','bedeck','bedevil','beef','beep','beetle','befall','befit','befog','befriend','beg','beget','beggar','begin','begrudge','beguile','behave','behead','behold','behoove','behove','belabor','belabour','belay','belch','belie','believe','belittle','bellow','belly','bellyache','belong','belt','bemoan','bemuse','benchmark','bend','benefit','bequeath','berate','bereave','berth','beseech','beset','besiege','besmirch','bespatter','bespeak','best','bestir','bestow','bestride','bet','betake','betide','betoken','betray','better','bewail','beware','bewilder','bewitch','bias','bicker','bicycle','bid','bide','biff','bifurcate','big','bike','bilk','bill','billet','billow','bin','bind','binge','biodegrade','bird','bisect','bitch','bite','bitmap','bivouac','bivvy','blab','blabber','black','blackball','blacken','blacklist','blackmail','blag','blame','blanch','blank','blanket','blare','blaspheme','blast','blather','blaze','blazon','bleach','bleat','bleed','bleep','blemish','blench','blend','bless','blight','blind','blindfold','blindfolded','blindside','blink','bliss','blister','blitz','bloat','block','blockade','blog','blood','bloom','bloop','blossom','blot','blow','blub','blubber','bludge','bludgeon','bluff','blunder','blunt','blur','blurt','blush','bluster','board','boast','bob','bobble','bode','bodge','bog','boggle','boil','bolster','bolt','bomb','bombard','bond','bone','bonk','boo','boob','boogie','book','bookmark','boom','boomerang','boost','boot','bootleg','booze','bop','border','bore','born','borrow','boss','botch','bother','bottle','bottleful','bottom','bounce','bound','bow','bowdlerise','bowdlerize','bowl','bowlful','box','boycott','braai','brace','braces','bracket','brag','braid','brain','brainstorm','brainwash','braise','brake','branch','brand','brandish','brave','brawl','bray','brazen','breach','break','breakfast','breast','breastfeed','breathalyse','breathalyze','breathe','breed','breeze','brew','bribe','brick','bridge','bridle','brief','brighten','brim','bring','bristle','broach','broadcast','broaden','broadside','broil','broker','brood','brook','browbeat','brown','browse','bruise','bruit','brush','brutalise','brutalize','bubble','buck','bucket','bucketful','buckle','bud','buddy','budge','budget','buff','buffer','buffet','bug','bugger','build','bulge','bulk','bulldoze','bullshit','bully','bum','bumble','bump','bunch','bundle','bung','bungle','bunk','bunker','bunt','buoy','burble','burden','burgeon','burglarize','burgle','burn','burnish','burp','burrow','burst','bury','bus','bushwhack','busk','bust','bustle','busy','butcher','butt','butter','button','buttonhole','buttress','buy','buzz','buzzing','bypass','cable','cache','cackle','caddie','cadge','cage','cajole','cake','calcify','calculate','calibrate','call','calm','calve','camouflage','camp','campaign','can','canalise','canalize','cancel','cane','cannibalise','cannibalize','cannon','cannulate','canoe','canonise','canonize','canoodle','canst','cant','canter','canvass','cap','caper','capitalise','capitalize','capitulate','capsize','captain','caption','captivate','capture','caramelise','caramelize','carbonise','carbonize','carburise','carburize','card','care','careen','career','caress','caricature','carjack','carol','carom','carouse','carp','carpet','carpool','carry','cart','cartwheel','carve','cascade','case','cash','cashier','casserole','cast','castigate','castrate','catalog','catalogue','catalyse','catalyze','catapult','catch','categorise','categorize','cater','caterwaul','catnap','caucus','caulk','cause','cauterise','cauterize','caution','cave','cavil','cavort','caw','cc','cease','cede','celebrate','cement','censor','censure','centralise','centralize','centre','certificate','certify','chafe','chaff','chain','chair','chalk','challenge','champ','champion','chance','change','channel','chant','chaperon','chaperone','char','characterise','characterize','charbroil','charge','chargesheet','chargrill','charm','chart','charter','chase','chasten','chastise','chat','chatter','chauffeur','cheapen','cheat','cheater','check','checkmate','cheek','cheep','cheer','cherish','chew','chicken','chide','chill','chillax','chime','chink','chip','chirp','chisel','chivvy','chlorinate','choke','chomp','choose','chop','choreograph','chortle','chorus','christen','chromakey','chronicle','chuck','chuckle','chug','chunder','chunter','churn','cinch','circle','circulate','circumcise','circumnavigate','circumscribe','circumvent','cite','civilise','civilize','clack','claim','clam','clamber','clamor','clamour','clamp','clang','clank','clap','clarify','clash','clasp','class','classify','clatter','claw','clean','cleanse','clear','cleave','clench','clerk','click','climax','climb','clinch','cling','clink','clinking','clip','cloak','clobber','clock','clog','clone','clonk','close','closet','clot','clothe','cloud','clout','clown','club','cluck','clue','clump','clunk','cluster','clutch','clutter','coach','coagulate','coalesce','coarsen','coast','coat','coax','cobble','cock','cocoon','coddle','code','codify','coerce','coexist','cogitate','cohabit','cohere','coil','coin','coincide','collaborate','collapse','collar','collate','collect','collectivise','collectivize','collide','colligate','collocate','collude','colonise','colonize','colorize','colour','comb','combat','combine','combust','come','comfort','command','commandeer','commemorate','commence','commend','comment','commentate','commercialise','commercialize','commingle','commiserate','commission','commit','commune','communicate','commute','compact','compare','compartmentalise','compartmentalize','compel','compensate','compete','compile','complain','complement','complete','complicate','compliment','comply','comport','compose','compost','compound','comprehend','compress','comprise','compromise','compute','computerise','computerize','con','conceal','concede','conceive','concentrate','conceptualise','conceptualize','concern','concertina','conciliate','conclude','concoct','concrete','concur','concuss','condemn','condense','condescend','condition','condone','conduct','cone','confer','confess','confide','configure','confine','confirm','confiscate','conflate','conflict','conform','confound','confront','confuse','confute','congeal','congratulate','congregate','conjecture','conjoin','conjugate','conjure','conk','connect','connive','connote','conquer','conscientise','conscientize','conscript','consecrate','consent','conserve','consider','consign','consist','console','consolidate','consort','conspire','constitute','constrain','constrict','construct','construe','consult','consume','consummate','contact','contain','contaminate','contemplate','contend','content','contest','contextualise','contextualize','continue','contort','contract','contradict','contraindicate','contrast','contravene','contribute','contrive','control','controvert','convalesce','convene','converge','converse','convert','convey','convict','convince','convoke','convulse','coo','cook','cool','coop','cooperate','coordinate','cop','cope','coppice','copulate','copy','copyright','cordon','core','cork','corkscrew','corner','corral','correct','correlate','correspond','corrode','corrupt','coruscate','cosh','cosset','cost','cosy','cotton','couch','cough','counsel','count','countenance','counter','counteract','counterbalance','counterfeit','countermand','counterpoint','countersign','couple','courier','course','court','covenant','cover','covet','cow','cower','cox','cozy','crack','crackle','cradle','craft','cram','cramp','crane','crank','crap','crash','crate','crave','crawl','crayon','creak','creaking','cream','crease','create','credential','credit','creep','cremate','creolise','creolize','creosote','crest','crew','crib','crick','criminalise','criminalize','crimp','cringe','crinkle','cripple','crisp','criticise','criticize','critique','croak','crochet','crook','croon','crop','cross','crouch','crow','crowd','crown','crucify','cruise','crumble','crumple','crunch','crusade','crush','cry','crystallise','crystallize','cube','cuckold','cuddle','cudgel','cue','cuff','cull','culminate','cultivate','culture','cup','curate','curb','curdle','cure','curl','curry','curse','curtail','curtain','curtsy','curve','cushion','cuss','customise','customize','cut','cwtch','cycle','dab','dabble','dally','dam','damage','dammit','damn','damp','dampen','dance','dandle','dangle','dare','darken','darn','dart','dash','date','daub','daunt','dawdle','dawn','daydream','dazzle','deactivate','deaden','deadhead','deafen','deal','debar','debase','debate','debilitate','debit','debrief','debug','debunk','debut','decamp','decant','decapitate','decay','deceive','decelerate','decentralise','decentralize','decide','decimalise','decimalize','decimate','decipher','deck','declaim','declare','declassify','decline','declutter','decode','decommission','decompose','decompress','deconsecrate','deconstruct','decontaminate','decontrol','decorate','decouple','decoy','decrease','decree','decriminalise','decriminalize','decry','decrypt','dedicate','deduce','deduct','deejay','deem','deepen','deface','defame','default','defeat','defecate','defect','defend','defer','defile','define','deflate','deflect','deflower','defog','defoliate','deforest','deform','defrag','defragment','defraud','defray','defrock','defrost','defuse','defy','degenerate','deglaze','degrade','degrease','dehumanise','dehumanize','dehydrate','deify','deign','delay','delegate','delete','deliberate','delight','delimit','delineate','deliquesce','deliver','delouse','delude','deluge','delve','demand','demarcate','demean','demerge','demilitarise','demilitarize','demineralise','demineralize','demist','demo','demob','demobilise','demobilize','democratise','democratize','demolish','demonise','demonize','demonstrate','demoralise','demoralize','demote','demotivate','demur','demystify','denationalise','denationalize','denigrate','denitrify','denominate','denote','denounce','dent','denude','deny','depart','depend','depersonalise','depersonalize','depict','deplane','deplete','deplore','deploy','depopulate','deport','depose','deposit','deprave','deprecate','depreciate','depress','depressurise','depressurize','deprive','depute','deputise','deputize','deracinate','derail','dereference','deregulate','deride','derive','derogate','descale','descend','describe','descry','desecrate','desegregate','deselect','desensitise','desensitize','desert','deserve','design','designate','desire','desist','deskill','desolate','despair','despise','despoil','destabilise','destabilize','destock','destroy','detach','detail','detain','detect','deter','deteriorate','determine','detest','dethrone','detonate','detour','detoxify','detract','detrain','devalue','devastate','develop','deviate','devise','devoice','devolve','devote','devour','diagnose','dial','dice','dicker','dictate','diddle','die','diet','differ','differentiate','diffract','diffuse','dig','digest','digitalise','digitalize','digitise','digitize','dignify','digress','dilate','dilute','diluted','dim','diminish','dimple','dine','ding','dink','dip','diphthongise','diphthongize','direct','dirty','dis','disable','disabuse','disadvantage','disaffiliate','disafforest','disagree','disallow','disambiguate','disappear','disappoint','disapprove','disarm','disarrange','disassemble','disassociate','disavow','disband','disbar','disbelieve','disburse','discard','discern','discharge','discipline','disclaim','disclose','discolor','discolour','discomfit','discomfort','discompose','disconcert','disconnect','discontinue','discount','discourage','discourse','discover','discredit','discriminate','discuss','disdain','disembark','disembowel','disenfranchise','disengage','disentangle','disestablish','disfigure','disgorge','disgrace','disguise','disgust','dish','dishearten','dishonor','dishonour','disillusion','disincentivise','disincentivize','disinfect','disinherit','disinhibit','disintegrate','disinter','disinvest','dislike','dislocate','dislodge','dismantle','dismay','dismember','dismiss','dismount','disobey','disorient','disorientate','disown','disparage','dispatch','dispel','dispense','disperse','displace','display','displease','disport','dispose','dispossess','disprove','dispute','disqualify','disregard','disrespect','disrobe','disrupt','dissect','dissemble','disseminate','dissent','dissimulate','dissipate','dissociate','dissolve','dissuade','distance','distend','distil','distill','distinguish','distort','distract','distress','distribute','distrust','disturb','disunite','ditch','dither','dive','diverge','diversify','divert','divest','divide','divine','divorce','divulge','divvy','do','dob','dock','doctor','document','dodge','doff','dog','dole','doll','dollarise','dollarize','domesticate','dominate','don','donate','doodle','doom','doorstep','dop','dope','dose','doss','dot','dote','double','doubt','douche','douse','dovetail','down','downchange','downgrade','downlink','download','downplay','downshift','downsize','dowse','doze','draft','drag','dragoon','drain','dramatise','dramatize','drape','draught','draw','drawl','dread','dream','dredge','drench','dress','dribble','drift','drill','drink','drip','drive','drivel','drizzle','drone','drool','droop','drop','drown','drowse','drug','drum','dry','dub','duck','duckie','ducks','duel','duff','dull','dumb','dumbfound','dummy','dump','dunk','dunt','dupe','duplicate','dust','dwarf','dwell','dwindle','dye','dynamite','earmark','earn','earth','ease','eat','eavesdrop','ebb','echo','eclipse','economise','economize','eddy','edge','edify','edit','editorialise','editorialize','educate','eff','efface','effect','effectuate','egg','ejaculate','eject','eke','elaborate','elapse','elbow','elect','electrify','electrocute','electroplate','elevate','elicit','elide','eliminate','elongate','elope','elucidate','elude','email','emanate','emancipate','emasculate','embalm','embargo','embark','embarrass','embed','embellish','embezzle','embitter','emblazon','embody','embolden','emboss','embrace','embroider','embroil','emcee','emend','emerge','emigrate','emit','emote','empathise','empathize','emphasise','emphasize','employ','empower','empty','emulate','emulsify','enable','enact','encamp','encapsulate','encase','encash','enchant','encircle','enclose','encode','encompass','encounter','encourage','encroach','encrypt','encumber','end','endanger','endear','endeavor','endeavour','endorse','endow','endure','energise','energize','enervate','enfeeble','enfold','enforce','enfranchise','engage','engender','engineer','engorge','engrave','engross','engulf','enhance','enjoin','enjoy','enlarge','enlighten','enlist','enliven','enmesh','ennoble','enquire','enrage','enrapture','enrich','enrol','enroll','ensconce','enshrine','enshroud','enslave','ensnare','ensue','ensure','entail','entangle','enter','entertain','enthral','enthrall','enthrone','enthuse','entice','entitle','entomb','entrance','entrap','entreat','entrench','entrust','entwine','enumerate','enunciate','envelop','envisage','envision','envy','epitomise','epitomize','equal','equalise','equalize','equate','equip','equivocate','eradicate','erase','erect','erode','err','erupt','escalate','escape','eschew','escort','espouse','espy','essay','establish','esteem','estimate','etch','eulogise','eulogize','euthanise','euthanize','evacuate','evade','evaluate','evangelise','evangelize','evaporate','even','eventuate','evict','evidence','evince','eviscerate','evoke','evolve','exacerbate','exact','exaggerate','exalt','examine','exasperate','excavate','exceed','excel','except','excerpt','exchange','excise','excite','exclaim','exclude','excommunicate','excoriate','excrete','exculpate','excuse','execute','exemplify','exempt','exercise','exert','exeunt','exfoliate','exhale','exhaust','exhibit','exhilarate','exhort','exhume','exile','exist','exit','exonerate','exorcise','exorcize','expand','expatiate','expect','expectorate','expedite','expel','expend','experience','experiment','expiate','expire','explain','explicate','explode','exploit','explore','export','expose','expostulate','expound','express','expropriate','expunge','expurgate','extemporise','extemporize','extend','exterminate','externalise','externalize','extinguish','extirpate','extol','extort','extract','extradite','extrapolate','extricate','extrude','exude','exult','eye','eyeball','eyeglasses','fabricate','face','facilitate','factor','factorise','factorize','fade','faff','fail','faint','fake','fall','falsify','falter','familiarise','familiarize','fan','fancy','fantasise','fantasize','fare','farewell','farm','farrow','fart','fascinate','fashion','fast','fasten','father','fathom','fatten','fault','favor','favour','fawn','fax','faze','fear','feast','feather','feature','federate','feed','feel','feign','feint','fell','fellate','feminise','feminize','fence','fend','ferment','ferret','ferry','fertilise','fertilize','fess','fester','festoon','fetch','fete','fetishise','fetishize','fetter','feud','fib','fictionalise','fictionalize','fiddle','fidget','field','fight','figure','filch','file','filibuster','fill','fillet','film','filter','finagle','finalise','finalize','finance','find','fine','finesse','finger','fingerprint','finish','fire','firebomb','firm','fish','fishtail','fit','fix','fizz','fizzle','flag','flagellate','flail','flake','flame','flank','flap','flare','flash','flat','flatline','flatten','flatter','flaunt','flavour','flay','fleck','flee','fleece','flesh','flex','flick','flicker','flight','flinch','fling','flip','flirt','flit','float','flock','flog','flood','floodlight','floor','flop','floss','flounce','flounder','flour','flourish','flout','flow','flower','flub','fluctuate','fluff','flummox','flunk','flush','fluster','flutter','fly','foal','foam','fob','focalise','focalize','focus','fog','foil','foist','fold','follow','foment','fondle','fool','foot','forage','forbear','forbid','force','ford','forearm','forecast','foreclose','foregather','foreground','foresee','foreshadow','foreshorten','forestall','foretell','forewarn','forfeit','forfend','forgather','forge','forget','forgive','forgo','fork','form','formalise','formalize','format','formulate','fornicate','forsake','forswear','fortify','forward','forwards','fossick','fossilise','fossilize','foster','foul','found','founder','fox','fracture','fragment','frame','franchise','frank','fraternise','fraternize','fray','freak','free','freelance','freeload','freestyle','freewheel','freeze','freight','frequent','freshen','fret','frighten','fringe','frisk','fritter','frizz','frizzle','frogmarch','frolic','front','frost','froth','frown','fruit','frustrate','fry','fuck','fudge','fuel','fulfil','fulfill','fulminate','fumble','fume','fumigate','function','fund','funk','funnel','furl','furlough','furnish','furrow','further','fuse','fuss','gab','gabble','gad','gag','gain','gainsay','gall','gallivant','gallop','galumph','galvanise','galvanize','gamble','gambol','gang','gape','garage','garden','gargle','garland','garner','garnish','garrison','garrote','garrotte','gas','gash','gasp','gatecrash','gather','gauge','gawk','gawp','gaze','gazump','gazunder','gear','gee','gel','geld','gen','generalise','generalize','generate','gentrify','genuflect','germinate','gerrymander','gestate','gesticulate','gesture','get','ghost','ghostwrite','gibber','gift','giggle','gild','ginger','gird','girdle','give','gladden','glamorise','glamorize','glance','glare','glass','glaze','gleam','glean','glide','glimmer','glimmering','glimpse','glint','glisten','glister','glitter','gloat','globalise','globalize','glom','glorify','glory','gloss','glow','glower','glue','glug','glut','gnash','gnaw','go','goad','gob','gobble','goggle','goldbrick','goof','google','goose','gore','gorge','gossip','gouge','govern','grab','grace','grade','graduate','graft','grant','grapple','grasp','grass','grate','gratify','gravitate','graze','grease','green','greet','grey','grieve','grill','grimace','grin','grind','grip','gripe','grit','grizzle','groan','grok','groom','grope','gross','grouch','ground','group','grouse','grout','grovel','grow','growl','grub','grudge','grumble','grunt','guarantee','guard','guess','guest','guffaw','guide','guillotine','guilt','gulp','gum','gun','gurgle','gurn','gush','gussy','gust','gut','gutter','guzzle','gybe','gyp','gyrate','hack','haemorrhage','haggle','hail','hallmark','halloo','hallucinate','halt','halve','ham','hammer','hamper','hamstring','hand','handcuff','handicap','handle','hang','hanker','happen','harangue','harass','harbor','harbour','harden','hare','hark','harm','harmonise','harmonize','harness','harp','harpoon','harrow','harrumph','harry','harvest','hash','hassle','hasten','hatch','hate','haul','haunt','have','haw','hawk','hazard','haze','head','headbutt','headhunt','headline','heal','heap','hear','hearken','hearten','heat','heave','heckle','hector','hedge','heed','heel','heft','heighten','heist','help','hem','hemorrhage','herald','herd','hesitate','hew','hex','hibernate','hiccough','hiccup','hide','hie','highball','highlight','hightail','hijack','hike','hinder','hinge','hint','hire','hiss','hit','hitch','hitchhike','hive','hoard','hoax','hobble','hobnob','hock','hoe','hog','hoick','hoist','hold','hole','holiday','holler','hollow','holster','home','homeschool','homestead','hone','honeymoon','honk','honour','hoodwink','hoof','hook','hoon','hoot','hoover','hop','hope','horn','horrify','horse','horsewhip','hose','hosepipe','hospitalise','hospitalize','host','hot','hotfoot','hound','house','hover','howl','huddle','huff','hug','hull','hum','humanise','humanize','humble','humiliate','humour','hump','hunch','hunger','hunker','hunt','hurdle','hurl','hurry','hurt','hurtle','husband','hush','husk','hustle','hybridise','hybridize','hydrate','hydroplane','hype','hyperventilate','hyphenate','hypnotise','hypnotize','hypothesise','hypothesize','ice','iconify','idealise','idealize','ideate','identify','idle','idolise','idolize','ignite','ignore','illuminate','illumine','illustrate','imagine','imagineer','imbibe','imbue','imitate','immerse','immigrate','immobilise','immobilize','immolate','immortalise','immortalize','immunise','immunize','immure','impact','impair','impale','impanel','impart','impeach','impede','impel','imperil','impersonate','impinge','implant','implement','implicate','implode','implore','imply','import','importune','impose','impound','impoverish','impregnate','impress','imprint','imprison','improve','improvise','impugn','inactivate','inaugurate','incapacitate','incarcerate','incarnate','incense','incentivise','incentivize','inch','incinerate','incise','incite','incline','include','incommode','inconvenience','incorporate','increase','incriminate','incubate','inculcate','incur','indemnify','indent','index','indicate','indict','individualise','individualize','individuate','indoctrinate','induce','induct','indulge','industrialise','industrialize','infantilise','infantilize','infect','infer','infest','infill','infiltrate','inflame','inflate','inflect','inflict','influence','inform','infringe','infuriate','infuse','ingest','ingratiate','inhabit','inhale','inhere','inherit','inhibit','initial','initialise','initialize','initiate','inject','injure','ink','inlay','innovate','inoculate','input','inscribe','inseminate','insert','inset','insinuate','insist','inspect','inspire','install','instance','instigate','instil','instill','institute','institutionalise','institutionalize','instruct','insulate','insult','insure','integrate','intend','intensify','inter','interact','interbreed','intercede','intercept','interchange','interconnect','intercut','interest','interface','interfere','interject','interlace','interleave','interlink','interlock','intermarry','intermesh','intermingle','intermix','intern','internalise','internalize','internationalise','internationalize','interpenetrate','interpolate','interpose','interpret','interrelate','interrogate','interrupt','intersect','intersperse','intertwine','intervene','interview','interweave','interwork','intimate','intimidate','intone','intoxicate','intrigue','introduce','intrude','intubate','intuit','inundate','inure','invade','invalid','invalidate','inveigh','inveigle','invent','inventory','invert','invest','investigate','invigilate','invigorate','invite','invoice','invoke','involve','ionise','ionize','irk','iron','irradiate','irrigate','irritate','irrupt','isolate','issue','italicise','italicize','itch','itemise','itemize','iterate','jab','jabber','jack','jackknife','jail','jam','jangle','jar','jaw','jaywalk','jazz','jeer','jell','jeopardise','jeopardize','jerk','jest','jet','jettison','jib','jibe','jig','jiggle','jilt','jingle','jink','jinx','jive','jockey','jog','joggle','join','joint','joke','jol','jolly','jolt','josh','jostle','jot','journey','joust','judder','judge','juggle','juice','jumble','jump','junk','justify','jut','juxtapose','keel','keelhaul','keen','keep','ken','key','keyboard','kibitz','kick','kid','kidnap','kill','kindle','kink','kip','kiss','kit','kite','klap','kludge','knacker','knead','knee','kneecap','kneel','knife','knight','knit','knock','knot','know','knuckle','kowtow','kvetch','label','labour','lace','lacerate','lack','lacquer','lactate','ladder','ladle','lag','lam','lamb','lambast','lambaste','lament','lamp','lampoon','lance','land','lands','landscape','languish','lap','lapse','lard','large','lark','lash','lasso','last','latch','lather','laud','laugh','launch','launder','lavish','lay','layer','laze','leach','lead','leaf','leaflet','leak','lean','leap','leapfrog','learn','lease','leash','leave','leaven','lech','lecture','leer','leg','legalise','legalize','legislate','legitimise','legitimize','lend','lengthen','lessen','let','letter','letterbox','level','lever','leverage','levitate','levy','liaise','libel','liberalise','liberalize','liberate','license','lick','lie','lift','ligate','light','lighten','like','liken','limber','lime','limit','limp','line','linger','link','lionise','lionize','liquefy','liquidate','liquidise','liquidize','lisp','list','listen','litigate','litter','live','liven','load','loads','loaf','loan','loathe','lob','lobby','lobotomise','lobotomize','localise','localize','locate','lock','lodge','loft','log','loiter','loll','lollop','long','look','looks','loom','loop','loose','loosen','loot','lop','lope','lord','lose','lounge','lour','louse','love','low','lowball','lower','lubricate','luck','lug','lull','lumber','lump','lunch','lunge','lurch','lure','lurk','lust','luxuriate','lynch','macerate','machine','madden','magic','magnetise','magnetize','magnify','mail','maim','mainline','mainstream','maintain','major','make','malfunction','malign','malinger','maltreat','man','manacle','manage','mandate','mangle','manhandle','manicure','manifest','manipulate','manoeuvre','mantle','manufacture','manure','map','mar','march','marginalise','marginalize','marinate','mark','market','maroon','marry','marshal','martyr','marvel','masculinise','masculinize','mash','mask','masquerade','mass','massacre','massage','master','mastermind','masticate','masturbate','match','mate','materialise','materialize','matriculate','matter','mature','maul','maunder','max','maximise','maximize','mean','meander','measure','mechanise','mechanize','medal','meddle','mediate','medicate','meditate','meet','meld','mellow','melt','memorialise','memorialize','memorise','memorize','menace','mend','menstruate','mention','meow','mercerise','mercerize','merchandise','merge','merit','mesh','mesmerise','mesmerize','mess','message','metabolise','metabolize','metamorphose','mete','meter','methinks','mew','mewl','miaow','microblog','microchip','micromanage','microwave','micturate','migrate','militarise','militarize','militate','milk','mill','mime','mimic','mince','mind','mine','mingle','miniaturise','miniaturize','minimise','minimize','minister','minor','mint','minute','mirror','misapply','misappropriate','misbehave','miscalculate','miscarry','miscast','misconceive','misconstrue','miscount','misdiagnose','misdial','misdirect','misfile','misfire','misgovern','mishandle','mishear','mishit','misinform','misinterpret','misjudge','miskey','mislay','mislead','mismanage','mismatch','misname','misplace','misplay','mispronounce','misquote','misread','misreport','misrepresent','miss','mission','misspell','misspend','mist','mistake','mistime','mistreat','mistrust','misunderstand','misuse','mitigate','mitre','mix','moan','mob','mobilise','mobilize','mock','mod','model','moderate','modernise','modernize','modify','modulate','moisten','moisturise','moisturize','mold','molder','molest','mollify','mollycoddle','molt','monitor','monopolise','monopolize','moo','mooch','moon','moonlight','moonwalk','moor','moot','mop','mope','moralise','moralize','morph','mortar','mortgage','mortify','mosey','mosh','mothball','mother','motion','motivate','motor','mould','moulder','moult','mount','mourn','mouse','mouth','move','movies','mow','muck','muddle','muddy','muff','muffle','mug','mulch','mull','multicast','multiply','multitask','mumble','mumbling','mummify','munch','murder','murmur','murmuring','murmurings','muscle','muse','mushroom','muss','muster','mutate','mute','mutilate','mutiny','mutter','muzzle','mystify','nab','nag','nail','name','namecheck','nap','narrate','narrow','narrowcast','nasalise','nasalize','nationalise','nationalize','natter','naturalise','naturalize','nauseate','navigate','near','nearer','nearest','neaten','necessitate','neck','necklace','need','needle','negate','negative','neglect','negotiate','neigh','nerve','nest','nestle','net','nettle','network','neuter','neutralise','neutralize','nibble','nick','nickname','niggle','nip','nitrify','nix','nobble','nod','nominalize','nominate','norm','normalise','normalize','nose','nosedive','nosh','notarise','notarize','notch','note','notice','notify','nourish','nudge','nuke','nullify','numb','number','nurse','nurture','nut','nuzzle','obey','obfuscate','object','objectify','oblige','obliterate','obscure','observe','obsess','obstruct','obtain','obtrude','obviate','occasion','occlude','occupy','occur','off','offend','offer','officiate','offload','offset','offshore','ogle','oil','okay','omit','ooze','open','operate','opine','oppose','oppress','opt','optimise','optimize','option','orbit','orchestrate','ordain','order','organise','organize','orient','orientate','originate','ornament','orphan','oscillate','ossify','ostracise','ostracize','oust','out','outbid','outclass','outdistance','outdo','outface','outfit','outflank','outfox','outgrow','outgun','outlast','outlaw','outline','outlive','outmaneuver','outmanoeuvre','outnumber','outpace','outperform','outplay','outpoint','output','outrage','outrank','outrun','outsell','outshine','outsmart','outsource','outstay','outstrip','outvote','outweigh','outwit','overachieve','overact','overawe','overbalance','overbook','overburden','overcharge','overcome','overcompensate','overcook','overdevelop','overdo','overdose','overdraw','overdub','overeat','overemphasize','overestimate','overexpose','overextend','overfeed','overflow','overfly','overgeneralise','overgeneralize','overgraze','overhang','overhaul','overhear','overheat','overindulge','overlap','overlay','overlie','overload','overlook','overpay','overplay','overpower','overprint','overproduce','overrate','overreach','overreact','override','overrule','overrun','oversee','oversell','overshadow','overshoot','oversimplify','oversleep','overspend','overstate','overstay','overstep','overstock','overstretch','overtake','overtax','overthrow','overtrain','overturn','overuse','overvalue','overwhelm','overwinter','overwork','overwrite','ovulate','owe','own','oxidise','oxidize','oxygenate','pace','pacify','pack','package','packetise','packetize','pad','paddle','padlock','page','paginate','pailful','pain','paint','pair','pal','palatalise','palatalize','pale','pall','palliate','palm','palpate','palpitate','pamper','pan','pander','panel','panhandle','panic','pant','paper','parachute','parade','parallel','paralyse','paralyze','paraphrase','parboil','parcel','parch','pardon','pare','park','parlay','parley','parody','parole','parrot','parry','parse','part','partake','participate','particularise','particularize','partition','partner','party','pass','passivise','passivize','paste','pasteurise','pasteurize','pasture','pat','patch','patent','patrol','patronise','patronize','patter','pattern','pause','pave','paw','pawn','pay','peak','peal','peck','pedal','peddle','pedestrianise','pedestrianize','pee','peek','peel','peep','peer','peg','pelt','pen','penalise','penalize','pencil','penetrate','pension','people','pep','pepper','perambulate','perceive','perch','percolate','perfect','perforate','perform','perfume','perish','perjure','perk','perm','permeate','permit','perpetrate','perpetuate','perplex','persecute','persevere','persist','personalise','personalize','personify','perspire','persuade','pertain','perturb','peruse','pervade','pervert','pester','pet','peter','petition','petrify','phase','philosophise','philosophize','phone','photocopy','photograph','photoshop','photosynthesise','photosynthesize','phrase','pick','picket','pickle','picnic','picture','picturise','picturize','piddle','piece','pierce','pig','pigeonhole','piggyback','pike','pile','pilfer','pill','pillage','pillory','pillow','pilot','pimp','pin','pinch','pine','ping','pinion','pink','pinpoint','pioneer','pip','pipe','pique','pirate','pirouette','piss','pit','pitch','pity','pivot','pixelate','pixellate','placate','place','plagiarise','plagiarize','plague','plait','plan','plane','plant','plaster','plasticise','plasticize','plate','plateau','play','plead','please','pledge','plight','plod','plonk','plop','plot','plough','pluck','plug','plumb','plummet','plump','plunder','plunge','plunk','pluralise','pluralize','ply','poach','pocket','point','poise','poison','poke','polarise','polarize','pole','poleax','poleaxe','police','polish','politicise','politicize','poll','pollard','pollinate','pollute','polymerise','polymerize','ponce','ponder','pong','pontificate','pony','poo','pooh','pool','poop','pootle','pop','popularise','popularize','populate','pore','port','portend','portion','portray','pose','posit','position','possess','posset','post','postmark','postpone','postulate','posture','pot','potter','pounce','pound','pour','pout','powder','power','practice','practise','praise','praises','prance','prang','prate','prattle','pray','preach','precede','precipitate','precis','preclude','predate','predecease','predetermine','predicate','predict','predispose','predominate','preen','preface','prefer','prefigure','prefix','preheat','prejudge','prejudice','preload','premaster','premiere','preoccupy','prep','prepare','prepone','preregister','presage','prescind','prescribe','preselect','presell','present','preserve','preset','preside','press','pressure','pressurise','pressurize','presume','presuppose','pretend','pretest','prettify','prevail','prevaricate','prevent','preview','prey','price','prick','prickle','pride','prime','primp','print','prioritise','prioritize','prise','privatise','privatize','privilege','prize','probate','probe','proceed','process','proclaim','procrastinate','procreate','proctor','procure','prod','produce','profane','profess','professionalise','professionalize','proffer','profile','profit','program','programme','progress','prohibit','project','proliferate','prolong','promenade','promise','promote','prompt','promulgate','pronounce','proof','proofread','prop','propagandise','propagandize','propagate','propel','prophesy','propitiate','propose','proposition','propound','proscribe','prosecute','proselytise','proselytize','prospect','prosper','prostitute','prostrate','protect','protest','protrude','prove','provide','provision','provoke','prowl','prune','pry','psych','psychoanalyse','publicise','publicize','publish','pucker','puff','puke','pull','pullulate','pulp','pulsate','pulse','pulverise','pulverize','pummel','pump','pun','punch','punctuate','puncture','punish','punt','pupate','purchase','purge','purify','purl','purloin','purport','purr','purse','pursue','purvey','push','pussyfoot','put','putrefy','putt','putter','puzzle','quack','quadruple','quaff','quail','quake','qualify','quantify','quarantine','quarrel','quarry','quarter','quarterback','quash','quaver','queer','quell','quench','query','quest','question','queue','quibble','quicken','quiet','quieten','quintuple','quip','quirk','quit','quiver','quiz','quote','quoth','rabbit','race','rack','radiate','radicalise','radicalize','radio','raffle','rag','rage','raid','rail','railroad','rain','raise','rake','rally','ram','ramble','ramp','rampage','randomise','randomize','range','rank','rankle','ransack','ransom','rant','rap','rape','rappel','rasp','rasterise','rasterize','rat','ratchet','rate','ratify','ration','rationalise','rationalize','rattle','ravage','rave','ravel','ravish','raze','razz','reach','reacquaint','react','reactivate','read','readdress','readies','readjust','readmit','ready','reaffirm','realign','realise','realize','reallocate','ream','reanimate','reap','reappear','reapply','reappoint','reappraise','rear','rearm','rearrange','reason','reassemble','reassert','reassess','reassign','reassure','reawaken','rebel','reboot','reborn','rebound','rebrand','rebuff','rebuild','rebuke','rebut','recall','recant','recap','recapitulate','recapture','recast','recede','receive','recess','recharge','reciprocate','recite','reckon','reclaim','reclassify','recline','recognise','recognize','recoil','recollect','recommence','recommend','recompense','reconcile','recondition','reconfigure','reconfirm','reconnect','reconnoitre','reconquer','reconsider','reconstitute','reconstruct','reconvene','record','recount','recoup','recover','recreate','recrudesce','recruit','rectify','recuperate','recur','recycle','redact','redden','redecorate','redeem','redefine','redeploy','redesign','redevelop','redial','redirect','rediscover','redistribute','redistrict','redo','redouble','redound','redraft','redraw','redress','reduce','reduplicate','reef','reek','reel','ref','refactor','refer','referee','reference','refill','refinance','refine','refit','reflate','reflect','refloat','refocus','reform','reformat','reformulate','refract','refrain','refresh','refrigerate','refuel','refund','refurbish','refuse','refute','regain','regale','regard','regenerate','register','regress','regret','regroup','regularise','regularize','regulate','regurgitate','rehabilitate','rehash','rehear','rehearse','reheat','rehome','rehouse','reign','reignite','reimburse','rein','reincarnate','reinforce','reinstate','reinterpret','reintroduce','reinvent','reinvest','reinvigorate','reissue','reiterate','reject','rejig','rejigger','rejoice','rejoin','rejuvenate','rekindle','relapse','relate','relaunch','relax','relay','release','relegate','relent','relieve','relinquish','relish','relive','reload','relocate','rely','remain','remainder','remake','remand','remap','remark','remarry','remaster','remediate','remedy','remember','remind','reminisce','remit','remix','remodel','remonstrate','remortgage','remould','remount','remove','remunerate','rename','rend','render','rendezvous','renege','renew','renounce','renovate','rent','reoccur','reoffend','reopen','reorder','reorganise','reorganize','reorient','repackage','repair','repatriate','repay','repeal','repeat','repel','repent','rephrase','replace','replay','replenish','replicate','reply','report','repose','repossess','represent','repress','reprieve','reprimand','reprint','reproach','reprocess','reproduce','reprove','repudiate','repulse','repurpose','request','require','requisition','requite','rerun','reschedule','rescind','rescue','research','researches','resect','resell','resemble','resent','reserve','reset','resettle','reshape','reshuffle','reside','resign','resist','resit','resize','reskill','resolve','resonate','resort','resound','resource','respect','respire','respond','respray','rest','restart','restate','restock','restore','restrain','restrict','restring','restructure','result','resume','resupply','resurface','resurrect','resuscitate','retail','retain','retake','retaliate','retard','retch','retell','retest','rethink','retire','retool','retort','retouch','retrace','retract','retrain','retreat','retrench','retrieve','retrofit','retry','return','reunify','reunite','reuse','rev','revalue','revamp','reveal','revel','revenge','reverberate','revere','reverse','revert','review','revile','revise','revisit','revitalise','revitalize','revive','revivify','revoke','revolt','revolutionise','revolutionize','revolve','reward','rewind','rewire','reword','rework','rewrite','rhapsodise','rhapsodize','rhyme','rib','rick','ricochet','rid','riddle','ride','ridge','ridicule','riffle','rifle','rig','right','rightsize','rile','rim','ring','rinse','riot','rip','ripen','riposte','ripple','rise','risk','ritualise','ritualize','rival','rivet','roam','roar','roast','rob','robe','rock','rocket','roger','roll','romance','romanticise','romanticize','romp','roof','room','roost','root','rope','rosin','roster','rot','rotate','rouge','rough','roughen','roughhouse','round','rouse','roust','rout','route','rove','row','rub','rubberneck','rubbish','ruck','rue','ruffle','ruin','ruins','rule','rumble','ruminate','rummage','rumor','rumour','rumple','run','rupture','rush','rust','rustle','sabotage','sack','sacrifice','sadden','saddle','safeguard','sag','sail','salaam','salivate','sally','salt','salute','salvage','salve','sample','sanctify','sanction','sand','sandbag','sandblast','sandpaper','sandwich','sanitise','sanitize','sap','sashay','sass','sate','satiate','satirise','satirize','satisfy','saturate','saunter','savage','save','savor','savour','saw','say','scald','scale','scallop','scalp','scamper','scan','scandalise','scandalize','scapegoat','scar','scare','scarf','scarify','scarper','scatter','scattering','scavenge','scent','schedule','schematise','schematize','scheme','schlep','schlepp','schmooze','school','schtup','schuss','scoff','scold','scoop','scoot','scope','scorch','score','scorn','scotch','scour','scourge','scout','scowl','scrabble','scram','scramble','scrap','scrape','scratch','scrawl','scream','screech','screen','screw','scribble','scrimp','script','scroll','scrounge','scrub','scrummage','scrunch','scruple','scrutinise','scrutinize','scud','scuff','scuffle','scull','sculpt','scupper','scurry','scuttle','scythe','seal','sealift','sear','search','season','seat','secede','seclude','second','secrete','section','secularise','secularize','secure','sedate','seduce','see','seed','seek','seep','seethe','segment','segregate','segue','seize','select','sell','sellotape','semaphore','send','sensationalise','sensationalize','sense','sensitise','sensitize','sentence','sentimentalise','sentimentalize','separate','sequence','sequester','sequestrate','serenade','serialise','serialize','sermonise','sermonize','serve','service','set','settle','sever','sew','sex','sexualise','sexualize','shack','shackle','shade','shadow','shaft','shag','shake','shalt','sham','shamble','shame','shampoo','shanghai','shape','share','sharpen','shatter','shave','shear','sheathe','shed','sheer','shell','shellac','shelter','shelve','shepherd','shield','shift','shimmer','shimmy','shin','shine','shinny','ship','shipwreck','shirk','shit','shiver','shock','shoe','shoehorn','shoo','shoot','shop','shoplift','shore','short','shorten','shortlist','shoulder','shout','shove','shovel','show','showboat','showcase','shower','shred','shriek','shrill','shrink','shrivel','shroom','shroud','shrug','shtup','shuck','shudder','shuffle','shun','shunt','shush','shut','shuttle','shy','sic','sick','sicken','side','sideline','sidestep','sideswipe','sidetrack','sidle','sieve','sift','sigh','sight','sightsee','sign','signal','signify','signpost','silence','silhouette','silt','silver','simmer','simper','simplify','simulate','simulcast','sin','sing','singe','single','sink','sip','siphon','sire','sit','site','situate','size','sizzle','skate','skateboard','skedaddle','sketch','skew','skewer','ski','skid','skim','skimp','skin','skip','skipper','skirmish','skirt','skitter','skive','skivvy','skulk','sky','skyjack','skyrocket','slack','slacken','slag','slake','slam','slander','slant','slap','slash','slate','slather','slaughter','slave','slaver','slay','sledge','sleek','sleep','sleepwalk','sleet','slew','slice','slick','slide','slight','slim','sling','slink','slip','slit','slither','slob','slobber','slog','slop','slope','slosh','slot','slouch','slough','slow','slug','sluice','slum','slumber','slump','slur','slurp','smack','smart','smarten','smash','smear','smell','smelt','smile','smirk','smite','smoke','smooch','smoodge','smooth','smother','smoulder','smudge','smuggle','snack','snaffle','snag','snaggle','snake','snap','snare','snarf','snarl','snatch','sneak','sneer','sneeze','snicker','sniff','sniffle','snigger','snip','snipe','snitch','snivel','snog','snooker','snoop','snooper','snooze','snore','snorkel','snort','snow','snowball','snowplough','snowplow','snub','snuff','snuffle','snuffling','snuggle','soak','soap','soar','sob','sober','socialise','socialize','sock','sod','sodomise','sodomize','soften','soil','sojourn','solace','solder','soldier','sole','solemnise','solemnize','solicit','solidify','soliloquize','solve','somersault','soothe','sorrow','sort','sough','sound','soundproof','soup','sour','source','souse','sow','space','span','spangle','spank','spar','spare','spark','sparkle','spatter','spattering','spawn','spay','speak','spear','spearhead','spec','specialise','specialize','specify','spectacles','spectate','speculate','speed','spell','spellcheck','spend','spew','spice','spiff','spike','spill','spin','spiral','spirit','spit','spite','splash','splatter','splay','splice','splinter','split','splosh','splurge','splutter','spoil','sponge','sponsor','spoof','spook','spool','spoon','sport','sports','spot','spotlight','spout','sprain','sprawl','spray','spread','spreadeagle','spring','springboard','sprinkle','sprint','spritz','sprout','spruce','spur','spurn','spurt','sputter','spy','squabble','squall','squander','square','squash','squat','squawk','squeak','squeal','squeeze','squelch','squint','squirm','squirrel','squirt','squish','stab','stabilise','stabilize','stable','stables','stack','staff','stage','stagger','stagnate','stain','stake','stalk','stall','stammer','stamp','stampede','stanch','stand','standardise','standardize','staple','star','starch','stare','start','startle','starve','stash','state','statement','station','staunch','stave','stay','steady','steal','steam','steamroller','steel','steep','steepen','steer','stem','stencil','step','stereotype','sterilise','sterilize','stew','stick','stickybeak','stiff','stiffen','stifle','stigmatise','stigmatize','still','stimulate','sting','stinger','stink','stint','stipple','stipulate','stir','stitch','stock','stockpile','stoke','stomach','stomp','stone','stonewall','stoop','stop','stopper','store','storm','storyboard','stow','straddle','strafe','straggle','straighten','strain','strand','strangle','strap','stratify','stravage','stravaig','stray','streak','stream','streamline','strengthen','stress','stretch','stretcher','strew','stride','strike','string','strip','strive','stroke','stroll','structure','struggle','strum','strut','stub','stud','study','stuff','stultify','stumble','stump','stun','stunt','stupefy','stutter','style','stymie','sub','subcontract','subdivide','subdue','subedit','subject','subjugate','sublet','sublimate','submerge','submit','subordinate','suborn','subpoena','subscribe','subside','subsidise','subsidize','subsist','substantiate','substitute','subsume','subtend','subtitle','subtract','subvert','succeed','succor','succour','succumb','suck','sucker','suckle','suction','sue','suffer','suffice','suffocate','suffuse','sugar','suggest','suit','sulk','sulks','sully','sum','summarise','summarize','summon','summons','sun','sunbathe','sunder','sunset','sup','superimpose','superintend','superpose','supersede','supersize','supersized','supervene','supervise','supplant','supplement','supply','support','suppose','suppress','suppurate','surcharge','surf','surface','surge','surmise','surmount','surpass','surprise','surrender','surround','survey','survive','suspect','suspend','suspenders','suss','sustain','suture','swab','swaddle','swagger','swallow','swamp','swan','swank','swap','swarm','swat','swath','swathe','sway','swear','sweat','sweep','sweeps','sweeten','swell','swelter','swerve','swig','swill','swim','swindle','swing','swipe','swirl','swish','switch','swivel','swoon','swoop','swoosh','swot','symbolise','symbolize','sympathise','sympathize','symptomize','synchronise','synchronize','syndicate','synthesise','synthesize','syringe','systematise','systematize','tab','table','tabulate','tack','tackle','tag','tail','tailgate','tailor','taint','take','talk','tally','tame','tamp','tamper','tan','tangle','tango','tank','tankful','tantalise','tantalize','tap','tape','taper','tar','target','tarmac','tarnish','tarry','tart','task','taste','tattle','tattoo','taunt','tauten','tax','taxi','taxicab','teach','team','tear','tease','tee','teem','teeter','teethe','telecast','telecommute','teleconference','telegraph','telemeter','teleoperate','telephone','teleport','telescope','televise','telex','tell','telnet','temp','temper','temporise','temporize','tempt','tenant','tend','tender','tenderise','tenderize','tense','tension','tergiversate','term','terminate','terraform','terrify','terrorise','terrorize','test','testify','tether','text','thank','thatch','thaw','theorise','theorize','thicken','thin','think','thirst','thrash','thread','threaten','thresh','thrill','thrive','throb','throbbing','throng','throttle','throw','thrust','thud','thumb','thump','thunder','thwack','thwart','tick','ticket','tickle','tide','tidy','tie','tighten','tile','till','tilt','time','timetable','tinge','tingle','tingling','tinker','tinkle','tinkling','tint','tip','tippex','tipple','tiptoe','tire','titillate','titivate','title','titrate','titter','toady','toast','toboggan','toddle','toe','tog','toggle','toil','toke','tolerate','toll','tone','tongue','tonify','tool','toot','tootle','top','topple','torch','torment','torpedo','torture','toss','tot','total','tote','totter','touch','tough','toughen','tour','tousle','tout','tow','towel','tower','toy','trace','track','trade','traduce','traffic','trail','train','traipse','trammel','tramp','trample','trampoline','tranquilize','tranquillize','transact','transcend','transcribe','transfer','transfigure','transfix','transform','transfuse','transgress','transit','translate','transliterate','transmit','transmogrify','transmute','transpire','transplant','transport','transpose','trap','trash','traumatise','traumatize','travel','traverse','trawl','tread','treasure','treat','treble','trek','tremble','trembling','trepan','trespass','trial','trick','trickle','trifle','trigger','trill','trim','trip','triple','triumph','trivialise','trivialize','troll','tromp','troop','trot','trouble','troubleshoot','trounce','trouser','truant','truck','trudge','trump','trumpet','truncate','trundle','truss','trust','try','tuck','tug','tugboat','tumble','tune','tunnel','turbocharge','turf','turn','tussle','tut','tutor','twang','tweak','tweet','twiddle','twig','twin','twine','twinkle','twirl','twist','twitch','twitter','twittering','type','typecast','typeset','typify','tyrannise','tyrannize','ulcerate','ululate','ump','umpire','unbalance','unban','unbend','unblock','unbuckle','unburden','unbutton','uncoil','uncork','uncouple','uncover','uncurl','undelete','underachieve','underbid','undercharge','undercook','undercut','underestimate','underestimation','underexpose','undergo','underlie','underline','undermine','underpay','underperform','underpin','underplay','underrate','underscore','undersell','undershoot','underspend','understand','understate','understudy','undertake','undervalue','underwrite','undo','undock','undress','undulate','unearth','unfasten','unfold','unfreeze','unfurl','unhand','unhinge','unhitch','unhook','unify','uninstall','unionise','unionize','unite','unlace','unlearn','unleash','unload','unlock','unloose','unloosen','unmask','unnerve','unpack','unpick','unplug','unravel','unroll','unsaddle','unscramble','unscrew','unseat','unsettle','unsubscribe','untangle','untie','unveil','unwind','unwrap','unzip','up','upbraid','upchange','upchuck','update','upend','upgrade','uphold','upholster','uplift','upload','uproot','upsell','upset','upshift','upskill','upstage','urge','urinate','use','usher','usurp','utilise','utilize','utter','vacate','vacation','vaccinate','vacillate','vacuum','valet','validate','value','vamoose','vandalise','vandalize','vanish','vanquish','vaporise','vaporize','varnish','vary','vault','veer','veg','vegetate','veil','vend','veneer','venerate','vent','ventilate','venture','verbalise','verbalize','verge','verify','versify','vest','vet','veto','vex','vibrate','victimise','victimize','vide','video','videotape','vie','view','viewing','vilify','vindicate','violate','visit','visualise','visualize','vitiate','vitrify','vocalize','voice','void','volley','volumise','volumize','volunteer','vomit','vote','vouch','vouchsafe','vow','voyage','vulgarise','vulgarize','wad','waddle','wade','waffle','waft','wag','wage','wager','waggle','wail','wait','waive','wake','wakeboard','waken','walk','wall','wallop','wallow','wallpaper','waltz','wander','wane','wangle','wank','want','warble','ward','warm','warn','warp','warrant','wash','wassail','waste','watch','water','waterproof','waterski','wave','waver','wax','waylay','weaken','wean','weaponise','weaponize','wear','weary','weasel','weather','weatherise','weatherize','weave','wed','wedge','wee','weed','weekend','weep','weigh','weight','weird','welch','welcome','weld','well','welly','welsh','wend','westernise','westernize','wet','whack','wheedle','wheel','wheeze','whelp','whet','whiff','while','whilst','whimper','whine','whinge','whinny','whip','whirl','whirr','whirring','whisk','whisper','whispering','whistle','whiten','whitewash','whittle','whiz','whizz','whoop','whoosh','whup','wick','widen','widow','wield','wig','wiggle','wildcat','will','wilt','wimp','win','wince','winch','wind','winds','windsurf','wine','wing','wink','winkle','winnow','winter','wipe','wire','wiretap','wise','wisecrack','wish','withdraw','wither','withhold','withstand','witness','witter','wobble','wolf','wonder','woo','woof','word','work','worm','worry','worsen','worship','worst','wound','wow','wowee','wrangle','wrap','wreak','wreathe','wreck','wrench','wrest','wrestle','wriggle','wring','wrinkle','writ','write','writhe','wrong','wrought','xerox','yack','yak','yank','yap','yaw','yawn','yearn','yell','yellow','yelp','yield','yodel','yoke','yomp','yowl','yuppify','zap','zero','zigzag','zing','zip','zone','zoom'].filter(w => !SAFE_NOUN.has(w)));
  const RELPRON = new Set(['who','which','whose']);
  const SUBJECT_PRONOUNS = new Set(['i','you','he','she','it','we','they']);
  const TITLES = new Set(['mr','mrs','ms','miss','mx','dr','sir','lord','lady','aunt','uncle','professor','prof','captain','king','queen','prince','princess','saint','st','madam','master']);
  const PARTICLES = new Set(['out','up','down','away','back']);
  const ADJ_SUFFIX = /^[a-z]{3,}(ful|ous|ive|able|ible|less|ish|al|ic)$/;
  const PARTICIPLE_SUFFIX = /^[a-z]{3,}(ed|ing)$/;
  // Common nouns that happen to end in a suffix ADJ_SUFFIX treats as adjective-shaped
  // (mostly "-ive" nouns like "detective") — checked here rather than folded into
  // ADJ_TAG_EXCEPT, since that set only gates the tagger's own signal, not this suffix guess.
  const SUFFIX_NOUN_EXCEPT = new Set(['detective','detectives','native','natives','relative','relatives','representative','representatives','objective','objectives','narrative','narratives','perspective','perspectives','captive','captives','initiative','initiatives','executive','executives','incentive','incentives','directive','directives','derivative','derivatives','alternative','alternatives','collective','collectives','motive','motives','adjective','adjectives']);
  const looksAdj = lw2 => ADJ.has(lw2) || (ADJ_SUFFIX.test(lw2) && !SUFFIX_NOUN_EXCEPT.has(lw2));
  const looksAdjInNP = lw2 => looksAdj(lw2) || PARTICIPLE_SUFFIX.test(lw2);
  // "to" always starts either a prepositional phrase ("to the shop") or an infinitive
  // ("to travel") — never the tail end of a noun/adjective phrase already in progress —
  // so every lookahead loop below should stop there rather than swallowing it.
  const isBoundaryWord = lw2 => COORD.has(lw2) || SUBORD.has(lw2) || RELPRON.has(lw2) || lw2==='that' || lw2==='to';
  // Many everyday nouns are spelled exactly like a verb ("sails", "plays", "watches",
  // "records") and this tagger's statistical model isn't reliable enough to call that
  // ambiguity correctly word-by-word in a short sentence. The safe question to ask instead
  // is structural: does a clearer verb turn up later in this same clause? If so, the
  // current ambiguous word can safely be treated as a noun (the clause already has its
  // verb). If nothing later looks like a verb before the clause ends, this word must BE
  // the verb — a clause can't have none — so it's left alone rather than merged away.
  const startsSubordMulti = idx => SUBORD_MULTI.some(phrase => {
    const parts = phrase.split(' ');
    return idx+parts.length<=n && raw.slice(idx, idx+parts.length).map(lower).join(' ')===phrase;
  });
  const hasLaterVerb = fromIdx => {
    let j = fromIdx;
    while(j<n && !/^[,.!?;]$/.test(raw[j]) && !isBoundaryWord(lower(raw[j])) && !startsSubordMulti(j)){
      const lw2 = lower(raw[j]);
      if(DET.has(lw2)){ j++; continue; }
      if(looksAdj(lw2) || taggerAdj(j)){ j++; continue; } // still inside a modifier run
      // A word immediately after a bare determiner is functioning inside a noun phrase —
      // most often a participial adjective ("the fallen leaves") — even when its own tag
      // looks verb-shaped (VBN/VBG); a genuine clause verb is never preceded by a bare
      // determiner with nothing in between. Skip it rather than treating it as confirmation.
      if(j>fromIdx && DET.has(lower(raw[j-1]))){ j++; continue; }
      // Decide on the first real content word reached rather than scanning further —
      // hunting deeper risks tripping over an unrelated noun/verb-ambiguous word inside
      // the object phrase (e.g. "leaves" in "the fallen leaves") and returning a false yes.
      return /^VB/.test(posOf(j));
    }
    return false;
  };

  const items = [];
  let i = 0;
  // vState tracks the current clause's predicate: 'none' (no verb yet), 'aux' (an
  // auxiliary/modal/linking verb has been seen but the main verb/complement hasn't),
  // 'full' (a main verb or complement has been tagged).
  let clauseHasSubject = false, vState = 'none', sentenceStart = true;
  let skipCommaReset = false;
  // Non-null while inside a comma-embedded subordinate-clause aside (e.g. "The child, as
  // the adult tells a joke, laughs.") — holds the outer clause's clauseHasSubject so it can
  // be restored at the aside's closing comma, rather than losing the outer subject entirely.
  let embeddedSubordSaved = null;
  // True while the sentence's opening clause is a fronted subordinate clause OR
  // prepositional phrase ("Before you leave, ...", "With a heavy heart, ..."). The comma
  // ending it is, structurally, a fresh clause boundary exactly like a full stop — the
  // imperative check below only fires when sentenceStart is true, so without this an
  // imperative main clause after a fronted phrase ("Before you leave, tidy your desk.")
  // would silently never be recognised as one.
  let frontedPhrasePending = false;

  while(i < n){
    const w = raw[i];
    const lw = lower(w);

    if(/^[,.!?;]$/.test(w)){
      if(items.length) items[items.length-1].text += w;
      const nextLw = (i+1<n) ? lower(raw[i+1]) : '';
      const opensEmbeddedClause = w===',' && (RELPRON.has(nextLw) || nextLw==='that');
      const opensSubordAside = w===',' && !opensEmbeddedClause && embeddedSubordSaved===null && SUBORD.has(nextLw);
      if(w === ',' && (skipCommaReset || opensEmbeddedClause)){
        skipCommaReset = opensEmbeddedClause ? true : false;
      } else if(w === ',' && opensSubordAside){
        embeddedSubordSaved = clauseHasSubject;
        clauseHasSubject = false; vState = 'none';
      } else if(w === ',' && embeddedSubordSaved !== null){
        clauseHasSubject = embeddedSubordSaved;
        vState = 'none';
        embeddedSubordSaved = null;
      } else {
        clauseHasSubject = false; vState = 'none';
        embeddedSubordSaved = null;
        if(frontedPhrasePending){ sentenceStart = true; frontedPhrasePending = false; }
      }
      if(w !== ',') sentenceStart = true;
      i++; continue;
    }

    let matchedMulti = null;
    for(const phrase of SUBORD_MULTI){
      const parts = phrase.split(' ');
      if(i+parts.length<=n && raw.slice(i,i+parts.length).map(lower).join(' ')===phrase){
        matchedMulti = parts.length; break;
      }
    }
    if(matchedMulti){
      if(items.length===0) frontedPhrasePending = true;
      items.push({text: raw.slice(i,i+matchedMulti).join(' '), cat:'subord'});
      i += matchedMulti; clauseHasSubject=false; vState='none'; continue;
    }

    if(RELPRON.has(lw) && items.length>0 && !sentenceStart){
      let j=i; const chunk=[];
      while(j<n && !/^[,.!?;]$/.test(raw[j])){ chunk.push(raw[j]); j++; }
      items.push({text: chunk.join(' '), cat:'relative'});
      skipCommaReset = true;
      i=j; continue;
    }
    if(lw==='that' && vState==='full'){
      let j=i; const chunk=[];
      while(j<n && !/^[,.!?;]$/.test(raw[j])){ chunk.push(raw[j]); j++; }
      items.push({text: chunk.join(' '), cat:'relative'});
      skipCommaReset = true;
      i=j; continue;
    }

    if(COORD.has(lw)){
      // "for" is ambiguous: a co-ordinating conjunction joining two clauses (the Y5
      // curriculum sense — "eats for they are hungry") vs. an ordinary preposition of
      // duration or beneficiary ("for thirty years", "for the guests"), which is far more
      // common in everyday writing. Only treat it as a conjunction when a clause (a
      // subject-ish word followed by a verb/aux) actually follows shortly after —
      // otherwise sweep the phrase as a plain, uncoloured preposition phrase.
      if(lw==='for'){
        let j=i+1, sawSubjectish=false, looksLikeClause=false;
        while(j<n && !/^[,.!?;]$/.test(raw[j]) && j<i+7){
          const lw2 = lower(raw[j]);
          if(AUX.has(lw2) || /^VB/.test(posOf(j))){ looksLikeClause = sawSubjectish; break; }
          if(SUBJECT_PRONOUNS.has(lw2) || DET.has(lw2) || isProperNounTag(j)) sawSubjectish = true;
          j++;
        }
        if(!looksLikeClause){
          let k=i; const chunk=[];
          while(k<n && !/^[,.!?;]$/.test(raw[k]) && !(k>i && isBoundaryWord(lower(raw[k])))){ chunk.push(raw[k]); k++; }
          items.push({text: chunk.join(' '), cat:'lit'});
          i=k; continue;
        }
      }
      items.push({text:w, cat:'coord'});
      vState='none'; i++; continue;
    }

    if(SUBORD.has(lw)){
      if(TIME_HINT.has(lw)){
        let j=i+1, contentCount=0, looksLikeClause=false, sawHeadNoun=false;
        while(j<n && !/^[,.!?;]$/.test(raw[j]) && !isBoundaryWord(lower(raw[j]))){
          const lw2 = lower(raw[j]);
          if(DET.has(lw2)){ j++; continue; }
          contentCount++;
          if(AUX.has(lw2)) looksLikeClause=true;
          // A run of adjectives ending in one noun is still just a short phrase ("the big
          // match") — only a SECOND non-adjective word (a real second clause element, like
          // a verb or another noun) means this is more than a simple noun phrase.
          if(looksAdj(lw2) || taggerAdj(j)){ j++; continue; }
          if(sawHeadNoun) looksLikeClause = true;
          sawHeadNoun = true; j++;
        }
        if(!looksLikeClause && contentCount<=2){
          let k=i; const chunk=[];
          while(k<n && !/^[,.!?;]$/.test(raw[k]) && !(k>i && isBoundaryWord(lower(raw[k])))){ chunk.push(raw[k]); k++; }
          items.push({text: chunk.join(' '), cat:'when'});
          i=k; continue;
        }
      }
      if(items.length===0) frontedPhrasePending = true;
      items.push({text:w, cat:'subord'});
      clauseHasSubject=false; vState='none'; i++; continue;
    }

    if(AUX.has(lw)){
      items.push({text:w, cat:'aux'});
      if(vState==='none') vState='aux';
      i++; continue;
    }

    // Negation ("do NOT touch", "is NOT happy", "cannot swim"): "not" has no colour category
    // of its own in this tool, and — crucially — isn't the clause's verb or subject either.
    // Left unhandled, it used to fall through to the "no subject yet" default and get
    // mistagged as who/doing itself, bumping the REAL verb after it into the wrong category
    // (e.g. "She does not like spiders." tagged "not" as doing and "like" as a plain literal).
    // Passing it through as a plain, uncoloured word — without touching clauseHasSubject or
    // vState — leaves that state exactly as it was, so the real verb/complement after "not"
    // still lands in the right slot.
    if(lw==='not'){
      items.push({text:w, cat:'lit'});
      i++; continue;
    }

    // Passive voice ("The lolly is eaten by the child"): "by" here introduces the agent —
    // who actually did the action — not a location, so it stays plain and the phrase after
    // it is tagged as who/subject rather than where.
    if(lw==='by' && items.length>=2 && items[items.length-1].cat==='doing' && items[items.length-2].cat==='aux'){
      items.push({text:w, cat:'lit'});
      clauseHasSubject = false; vState = 'none';
      i++; continue;
    }

    if(PREP_WHERE.has(lw)){
      let k=i; const chunk=[];
      while(k<n && !/^[,.!?;]$/.test(raw[k]) && !(k>i && isBoundaryWord(lower(raw[k])))){ chunk.push(raw[k]); k++; }
      items.push({text: chunk.join(' '), cat:'where'});
      i=k; continue;
    }

    // "like" is in PREP_OTHER (see below) for its overwhelmingly common preposition sense
    // ("looks like rain"), but right after an aux with no verb yet (vState==='aux' — "does
    // not LIKE spiders", "I DO like cake") it's the clause's genuine main verb, and a clause
    // can't have none — skip the preposition treatment there so it falls through to the
    // normal doing-assignment below instead of stranding the object with no verb at all.
    if(PREP_OTHER.has(lw) && !(vState==='aux' && lw==='like')){
      if(sentenceStart && !clauseHasSubject){
        // Fronted prepositional phrase before the sentence has a subject yet ("With a heavy
        // heart, the dog walked away."): sweep the WHOLE phrase as one chunk rather than just
        // this one word. Leaving the rest to the normal rules below (as the mid-clause case
        // does) wrongly promotes the phrase's own noun ("heart") to who, since those rules
        // assume "no subject yet" can only mean the real subject is next.
        let k=i; const chunk=[];
        while(k<n && !/^[,.!?;]$/.test(raw[k]) && !(k>i && isBoundaryWord(lower(raw[k])))){ chunk.push(raw[k]); k++; }
        // This is exactly the Y4 "fronted adverbial" structure (how/where/when + comma +
        // who + doing + what) — PREP_WHERE- and TIME_HINT-led fronted phrases already land
        // in "where"/"when" via their own branches elsewhere, so the only gap here is manner:
        // "with"/"without" fronting a phrase overwhelmingly reads as how something was done
        // ("with a heavy heart", "without hesitation"). The rest of PREP_OTHER (of, than,
        // despite...) doesn't map cleanly onto how/where/when, so those stay plain — still
        // reassignable to any category via the chip's own dropdown either way.
        const cat = (lw==='with' || lw==='without') ? 'how' : 'lit';
        items.push({text: chunk.join(' '), cat});
        if(items.length===1) frontedPhrasePending = true;
        i=k; continue;
      }
      // A preposition that isn't clearly spatial (where) or temporal (when) — e.g. "with",
      // "of" — doesn't fit any of this tool's categories cleanly, so it's left as a plain,
      // uncoloured word rather than forced into "what". The noun phrase after it is still
      // tagged normally by the rules below.
      items.push({text:w, cat:'lit'});
      i++; continue;
    }

    if(lw==='to'){
      // "to" plays two completely different roles: a preposition of direction ("sails to
      // Newfoundland", "moved to a school") or an infinitive marker ("wants to travel").
      // A determiner or a proper noun right after it means direction — sweep it as a
      // "where" phrase like any other preposition. A bare lower-case word means it's
      // introducing an infinitive verb, which this tool has no dedicated colour for, so it
      // reads as the clause's "doing" — much closer to the truth than letting a stray "to"
      // get mistaken for a fresh subject and the real verb after it fall into "what".
      const nextLw = (i+1<n) ? lower(raw[i+1]) : '';
      const nextIsDirectional = i+1<n && (DET.has(nextLw) || isProperNounTag(i+1) || /^[A-Z]/.test(raw[i+1]));
      if(nextIsDirectional){
        let k=i; const chunk=[];
        while(k<n && !/^[,.!?;]$/.test(raw[k]) && !(k>i && isBoundaryWord(lower(raw[k])))){ chunk.push(raw[k]); k++; }
        items.push({text: chunk.join(' '), cat:'where'});
        i=k; continue;
      }
      if(i+1<n && !/^[,.!?;]$/.test(raw[i+1])){
        items.push({text: w+' '+raw[i+1], cat:'doing'});
        vState = 'full';
        i += 2; sentenceStart=false; continue;
      }
      // "to" with nothing usable after it (end of sentence) — leave it uncoloured rather
      // than guessing.
      items.push({text:w, cat:'lit'});
      i++; continue;
    }

    if(TITLES.has(lw)){
      // A title (Mr, Dr, Aunt…) introduces a proper name: keep consuming capitalised
      // words as part of the same name, e.g. "Mr Fox" stays one who/what block.
      let k=i+1; const chunk=[w];
      while(k<n && /^[A-Z]/.test(raw[k]) && !isBoundaryWord(lower(raw[k])) && !AUX.has(lower(raw[k]))){ chunk.push(raw[k]); k++; }
      const cat = (vState==='full' || vState==='aux') ? 'what' : 'who';
      items.push({text: chunk.join(' '), cat});
      if(cat==='who') clauseHasSubject=true;
      i=k; sentenceStart=false; continue;
    }

    if(DET.has(lw)){
      // Gather any adjectives (each becomes its own separate "describe" block, matching
      // the source document), then the noun. The determiner attaches to whichever comes
      // first — the first adjective if any, otherwise the noun itself — e.g. "the
      // delicious lolly" -> describe:"the delicious", what:"lolly".
      let k=i+1; const adjWords=[];
      while(k<n){
        const cur = raw[k];
        if(/^[,.!?;]$/.test(cur)){
          if(cur===',' && k+1<n && (looksAdjInNP(lower(raw[k+1])) || taggerAdj(k+1))){
            if(adjWords.length) adjWords[adjWords.length-1] += ',';
            k++; continue;
          }
          break;
        }
        if(looksAdjInNP(lower(cur)) || taggerAdj(k)){ adjWords.push(cur); k++; continue; }
        break;
      }
      let hasNoun = k<n && !/^[,.!?;]$/.test(raw[k]) && !isBoundaryWord(lower(raw[k])) && !AUX.has(lower(raw[k]));
      // If we already gathered adjective(s) and the next word is tagged as a verb, it can't
      // be this phrase's noun — one of the "adjectives" is actually the noun itself, and
      // this word is the clause's real verb, still waiting to be tagged by the main loop
      // (e.g. "The plastic bends": "plastic" mistaken for an adjective, "bends" is not a
      // noun to swallow, it's the verb).
      if(hasNoun && adjWords.length && /^VB/.test(posOf(k))){
        hasNoun = false;
      }
      let nounWord = hasNoun ? raw[k] : null;
      if(hasNoun) k++;
      // A possessive ("the cat's") isn't complete on its own — it needs the noun it
      // possesses, so keep that as part of the same block: "the cat's ball", not two blocks.
      if(hasNoun && /'s$|s'$/.test(nounWord) && k<n && !/^[,.!?;]$/.test(raw[k]) && !isBoundaryWord(lower(raw[k])) && !AUX.has(lower(raw[k]))){
        nounWord += ' ' + raw[k];
        k++;
      }
      // Safety net: a determiner-led noun phrase must end in a noun. If adjective-gathering
      // ran out without finding one (e.g. the tagger mistags an ambiguous word like "adult"
      // as an adjective), the last word gathered was actually the noun, not a describer.
      if(!hasNoun && adjWords.length){
        nounWord = adjWords.pop().replace(/,$/, '');
        hasNoun = true;
      }
      let cat = (vState==='full' || vState==='aux') ? 'what' : 'who';
      if(!adjWords.length && nounWord && TIME_PHRASE_DET.has(lw) && TIME_NOUNS.has(lower(nounWord))){
        cat = 'when';
      }
      // A noun phrase right after a coordinating conjunction, with nothing but the sentence
      // end following it (e.g. "the lolly and the fruit."), is continuing the previous list
      // rather than starting a new clause — so it keeps the category from before the
      // conjunction instead of defaulting to "who". A clause with its own verb still
      // following (e.g. "...and the adult talks.") is unaffected, since that's not sentence-final.
      if(cat!=='when' && items.length>=2 && items[items.length-1].cat==='coord'){
        const isSentenceFinal = k>=n || /^[,.!?;]$/.test(raw[k]);
        const prevCat = items[items.length-2].cat;
        if(isSentenceFinal && ['what','where','when','how','describe'].includes(prevCat)){
          cat = prevCat;
        }
      }
      if(adjWords.length){
        items.push({cat:'describe', text: w + ' ' + adjWords[0]});
        for(let ai=1; ai<adjWords.length; ai++) items.push({cat:'describe', text: adjWords[ai]});
        if(nounWord){ items.push({cat, text: nounWord}); if(cat==='who') clauseHasSubject=true; }
      } else {
        items.push({cat, text: nounWord ? (w+' '+nounWord) : w});
        if(cat==='who') clauseHasSubject=true;
      }
      i=k; sentenceStart=false; continue;
    }

    if((lw.endsWith('ly') && !ADV_EXCEPT.has(lw)) || ADV_EXTRA.has(lw)){
      items.push({text:w, cat:'how'}); i++; continue;
    }

    // Imperative sentence ("Tap the button.", "Colour the picture carefully.", "Give the
    // dog a bone."): the sentence opens directly with its verb — the subject ("you") is
    // implied, never stated — so defaulting the first bare word of a clause to "who" (as
    // the branch below does for every other sentence) is wrong here. Only fires at the very
    // start of the sentence, and only when no OTHER verb turns up later in the clause —
    // that second check is what stops it firing on a real subject that merely happens to be
    // a bossy-verb-shaped word, e.g. "Colour is important." ("is" confirms "Colour" is the
    // subject there, not the verb). Deliberately placed BEFORE the looksAdj/taggerAdj check
    // below: several imperative verbs this tool cares about (tidy, clean, clear, open...)
    // are also genuine adjectives, and the adjective branch would otherwise claim them first
    // and misread the following noun phrase as if IT were the subject (e.g. "tidy your desk"
    // → "tidy" swallowed as a describe word, "your" wrongly promoted to subject).
    if(sentenceStart && !clauseHasSubject && !AUX.has(lw)
       && (/^VB/.test(posOf(i)) || ENGLISH_VERBS.has(lw)) && !hasLaterVerb(i+1)){
      let text = w;
      if(i+1<n && PARTICLES.has(lower(raw[i+1]))){ text += ' ' + raw[i+1]; i++; }
      items.push({text, cat:'doing'});
      // No real subject exists, but marking one as "found" is what routes every later word
      // in this clause through the what/object path instead of a second, equally wrong "who".
      clauseHasSubject = true;
      vState = 'full';
      sentenceStart = false; i++; continue;
    }

    if(looksAdj(lw) || taggerAdj(i)){
      if(vState==='aux'){
        items.push({text:w, cat:'describe'});
        vState='full'; i++; continue;
      }
      if(i+1>=n || /^[,.!?;]$/.test(raw[i+1])){
        items.push({text:w, cat:'describe'}); i++; continue;
      }
      // No determiner: each adjective is its own "describe" block, then the noun.
      let k=i; const adjWords2=[];
      while(k<n){
        const cur = raw[k];
        if(/^[,.!?;]$/.test(cur)){
          if(cur===',' && k+1<n && (looksAdj(lower(raw[k+1])) || taggerAdj(k+1))){
            if(adjWords2.length) adjWords2[adjWords2.length-1] += ',';
            k++; continue;
          }
          break;
        }
        if(looksAdj(lower(cur)) || taggerAdj(k)){ adjWords2.push(cur); k++; continue; }
        break;
      }
      let hasNoun2 = k<n && !/^[,.!?;]$/.test(raw[k]) && !isBoundaryWord(lower(raw[k])) && !AUX.has(lower(raw[k]));
      // Same verb guard as the determiner branch: don't swallow the clause's real verb as
      // if it were this phrase's noun just because an adjective came before it.
      if(hasNoun2 && adjWords2.length && /^VB/.test(posOf(k))){
        hasNoun2 = false;
      }
      let nounWord2 = hasNoun2 ? raw[k] : null;
      if(hasNoun2) k++;
      // Same safety net as the determiner branch above: an adjective run must end in a noun.
      if(!hasNoun2 && adjWords2.length){
        nounWord2 = adjWords2.pop().replace(/,$/, '');
        hasNoun2 = true;
      }
      // "last night", "next week": words like "last"/"next" aren't in the determiner set
      // (they're grammatically adjectives), so they reach this branch rather than the
      // determiner one — but a bare time phrase like this reads better as one "when" block
      // than as a separate describe chip plus an object.
      if(hasNoun2 && adjWords2.length===1 && TIME_PHRASE_DET.has(lower(adjWords2[0])) && TIME_NOUNS.has(lower(nounWord2))){
        items.push({cat:'when', text: adjWords2[0]+' '+nounWord2});
        i=k; sentenceStart=false; continue;
      }
      adjWords2.forEach(aw => items.push({cat:'describe', text:aw}));
      if(hasNoun2){
        const cat = (vState==='full' || vState==='aux') ? 'what':'who';
        items.push({text: nounWord2, cat});
        if(cat==='who') clauseHasSubject=true;
      }
      i=k; sentenceStart=false; continue;
    }

    // A bare noun-noun compound subject ("Roman army", "police officer", "football team",
    // "Thomas Edison"): once a subject is under way with no verb seen yet, a following bare
    // word that is itself capitalised (virtually always a name continuing) or tagged as a
    // noun (NN/NNS) by the tagger is continuing that same noun phrase — not introducing a
    // verb, which is what the position alone would otherwise suggest. This is the single
    // biggest source of "ordinary noun mistaken for the verb" errors this tagger sees:
    // without it, "The Roman army built roads" tags "army" as the verb and "built" as its
    // object, purely because "army" happens to be the first bare word after the subject.
    if(clauseHasSubject && vState==='none' && items.length && items[items.length-1].cat==='who'
       && !AUX.has(lw) && (/^[A-Z]/.test(w) ? !sentenceStart : (posOf(i)==='NN' || posOf(i)==='NNS'))
       && (SAFE_NOUN.has(lw) || hasLaterVerb(i+1))){
      items[items.length-1].text += ' ' + w;
      sentenceStart=false; i++; continue;
    }

    // A subject pronoun right after a coordinating conjunction (e.g. "...for they are
    // hungry") always introduces a new clause with its own subject, even though
    // clauseHasSubject is still (correctly) true from the clause before the conjunction —
    // that flag alone can't tell "eats and plays" (same subject, second verb) apart from
    // "eats for they are hungry" (new clause), so a pronoun here overrides it.
    if(items.length && items[items.length-1].cat==='coord' && SUBJECT_PRONOUNS.has(lw)){
      items.push({text:w, cat:'who'}); clauseHasSubject=true;
    } else if(items.length>=2 && items[items.length-1].cat==='coord' && items[items.length-2].cat==='who'
       && vState==='none' && (/^[A-Z]/.test(w) || posOf(i)==='NN' || posOf(i)==='NNS' || isProperNounTag(i))
       && hasLaterVerb(i+1)){
      // "Tom and Jerry played chess": a bare noun straight after "and", following an
      // already-tagged subject with no verb yet, is joining that subject rather than
      // becoming a stray verb — same reasoning as the compound-subject check above, just
      // with a conjunction in between.
      items.push({text:w, cat:'who'});
      sentenceStart=false; i++; continue;
    } else if(items.length>=2 && items[items.length-1].cat==='coord'
       && (i+1>=n || /^[,.!?;]$/.test(raw[i+1])) && ['what','where','when','how','describe'].includes(items[items.length-2].cat)){
      // "London and Cardiff.": a bare word right before the sentence/clause end, straight
      // after a conjunction, is continuing that earlier list (of objects, places, etc.)
      // rather than starting a new clause — mirrors the equivalent determiner-led case above.
      items.push({text:w, cat: items[items.length-2].cat});
      sentenceStart=false; i++; continue;
    } else if(!clauseHasSubject){
      items.push({text:w, cat:'who'}); clauseHasSubject=true;
    } else if(vState==='none' || vState==='aux'){
      let text = w;
      if(i+1<n && PARTICLES.has(lower(raw[i+1]))){ text += ' ' + raw[i+1]; i++; }
      items.push({text, cat:'doing'}); vState='full';
    } else {
      items.push({text:w, cat:'what'});
    }
    sentenceStart=false; i++;
  }

  return items;
}

/* ---------- Free-write panel ---------- */
