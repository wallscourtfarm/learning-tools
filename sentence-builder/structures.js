/* Sentence Builder — year-group sentence structures (Y1-Y6), from Jacobs Education's
 * Colour-Coded Sentence Progression, with CLF curriculum examples. Shared by the Teach tab
 * and the pupil side (Free build targets). Moved here from the staff Colour-Coded Sentence
 * Builder on 10.10.26.
 */
const YEARS = (() => {
  const s = (type, def, extra) => Object.assign({type, default:def}, extra || {});
  const comma = () => ({type:'comma'});
  const lit = text => ({type:'lit', text});
  return [
{
  id:'y1', label:'Year 1',
  intro:"Year 1 pupils build a solid foundation in sentence construction: simple sentences with a subject (who) and a verb (doing), and joining words or clauses with 'and'.",
  structures:[
    { title:"Simple sentence", note:"who + doing",
      pattern:[ s('who','The magnet'), s('doing','attracts') ],
      examples:["The magnet attracts.","The magnet attracted."] },
    { title:"Simple sentence", note:"who + doing + what",
      pattern:[ s('who','The seed'), s('doing','needs'), s('what','water') ],
      examples:["The seed needs water.","The seed needed water."] },
    { title:"Simple sentence", note:"who + linking verb (is/was) + describe",
      pattern:[ s('who','The glass'), s('aux','is',{options:['is','was']}), s('describe','transparent') ],
      examples:["The glass is transparent.","The glass was transparent."] },
    { title:"Simple sentence using 'and'", note:"who + doing + and + doing",
      pattern:[ s('who','The bird'), s('doing','flies'), lit('and'), s('doing','sings') ],
      examples:["The bird flies and sings.","The bird flew and sang."] },
    { title:"Simple sentence using 'and'", note:"who + doing + what + and + what",
      pattern:[ s('who','The pupil'), s('doing','locates'), s('what','London'), lit('and'), s('what','Cardiff') ],
      examples:["The pupil locates London and Cardiff.","The pupil located London and Cardiff."] },
    { title:"Simple sentence using 'and'", note:"who + linking verb + describe + and + describe",
      pattern:[ s('who','The weather'), s('aux','is',{options:['is','was']}), s('describe','cold'), lit('and'), s('describe','windy') ],
      examples:["The weather is cold and windy.","The weather was cold and windy."] },
    { title:"Compound sentence using 'and'", note:"Joining two main clauses: who + doing + and + who + doing",
      pattern:[ s('who','The sun'), s('doing','shines'), lit('and'), s('who','the flowers'), s('doing','grow') ],
      examples:["The sun shines and the flowers grow.","The sun shone and the flowers grew."] },
    { title:"Compound sentence using 'and'", note:"Vary the structure, e.g. who + doing + what + and + who + doing",
      pattern:[ s('who','Baird'), s('doing','invented'), s('what','the television'), lit('and'), s('who','the family'), s('doing','watched') ],
      examples:["Baird invented the television and the family watched.","Baird invents the television and the family watches."] }
  ]
},
{
  id:'y2', label:'Year 2',
  intro:"Year 2 pupils expand sentences with adjectives and adverbs of manner ('how'), meet a wider range of co-ordinating conjunctions (but, so, or), start complex sentences with 'because', and use the progressive verb form.",
  structures:[
    { title:"Recap compound sentence", note:"Co-ordinating conjunctions: and → but → so → or",
      pattern:[ s('who','The fire'), s('doing','spread'), s('coord','so',{options:['so','but','or','and']}), s('who','the people'), s('doing','lost'), s('what','their homes') ],
      examples:["The fire spread so the people lost their homes.","The fire spreads so the people lose their homes."] },
    { title:"Simple sentence with expanded noun phrase", note:"who + doing + describe + what (add commas for lists of adjectives when ready)",
      pattern:[ s('who','Brunel'), s('doing','built'), s('describe','incredible'), s('what','the bridge') ],
      examples:["Brunel built the incredible bridge.","Brunel builds the incredible bridge."] },
    { title:"Simple sentence", note:"who + doing + how",
      pattern:[ s('who','The climate'), s('doing','varies'), s('how','greatly') ],
      examples:["The climate varies greatly.","The climate varied greatly."] },
    { title:"Simple sentence", note:"who + doing + what + how",
      pattern:[ s('who','The nurse'), s('doing','treats'), s('what','the patients'), s('how','kindly') ],
      examples:["The nurse treats the patients kindly.","The nurse treated the patients kindly."] },
    { title:"Complex sentence using 'because'", note:"Subordinating conjunctions: because → when → if → that",
      pattern:[ s('who','Animals'), s('doing','disappear'), s('subord','because',{options:['because','when','if','that']}), s('who','people'), s('doing','destroy'), s('what','their habitat') ],
      examples:["Animals disappear because people destroy their habitat.","Animals disappeared because people destroyed their habitat."] },
    { title:"Simple progressive sentence", note:"who + is/was (auxiliary) + doing (-ing form)",
      pattern:[ s('who','The habitat'), s('aux','is',{options:['is','was']}), s('doing','changing') ],
      examples:["The habitat is changing.","The habitat was changing."] }
  ]
},
{
  id:'y3', label:'Year 3',
  intro:"Year 3 pupils recap and extend co-ordinating and subordinating conjunctions (yet, as, while, until, since), add 'where' and 'when' to simple sentences, and meet the present perfect verb form (has/have + past tense).",
  structures:[
    { title:"Recap compound sentence", note:"Co-ordinating conjunctions and/but/so/or → introduce 'yet'",
      pattern:[ s('who','The magnet'), s('doing','attracts'), s('what','the nail'), s('coord','so',{options:['so','yet','and','but','or']}), s('who','the nail'), s('doing','moves') ],
      examples:["The magnet attracts the nail so the nail moves.","The magnet attracted the nail so the nail moved."] },
    { title:"Recap complex sentence", note:"Subordinating conjunction 'because' → introduce as/while/until/since",
      pattern:[ s('who','Magma'), s('doing','rises'), s('subord','while',{options:['while','as','until','since','because']}), s('who','the volcano'), s('doing','builds'), s('what','pressure') ],
      examples:["Magma rises while the volcano builds pressure.","Magma rose while the volcano built pressure."] },
    { title:"Simple sentence", note:"who + doing + where",
      pattern:[ s('who','Cabot'), s('doing','sailed'), s('where','to Newfoundland') ],
      examples:["Cabot sailed to Newfoundland.","Cabot sails to Newfoundland."] },
    { title:"Simple sentence", note:"who + doing + what + where",
      pattern:[ s('who','The geographer'), s('doing','compares'), s('what','biomes'), s('where','in the Mediterranean') ],
      examples:["The geographer compares biomes in the Mediterranean.","The geographer compared biomes in the Mediterranean."] },
    { title:"Simple sentence", note:"who + doing + when",
      pattern:[ s('who','The plotters'), s('doing','met'), s('when','in November') ],
      examples:["The plotters met in November.","The plotters meet in November."] },
    { title:"Simple sentence", note:"who + doing + what + when",
      pattern:[ s('who','The armies'), s('doing','fought'), s('what','the battle'), s('when','in 1642') ],
      examples:["The armies fought the battle in 1642.","The armies fight the battle in 1642."] },
    { title:"Simple present perfect sentence", note:"who + has/have (auxiliary) + doing (past participle)",
      pattern:[ s('who','The caterpillar'), s('aux','has',{options:['has','have']}), s('doing','changed') ],
      examples:["The caterpillar has changed.","The caterpillars have changed."] }
  ]
},
{
  id:'y4', label:'Year 4',
  intro:"Year 4 pupils recap complex sentences and add although/before/after, explore fronted adverbial phrases, move the subordinate clause to the start of a sentence, and expand noun phrases with extra nouns and prepositional phrases.",
  structures:[
    { title:"Recap complex sentence", note:"Subordinating conjunctions from Y2/Y3 → introduce although/before/after",
      pattern:[ s('who','The Anglo-Saxons'), s('doing','settled'), s('subord','before',{options:['before','after','although']}), s('who','the Vikings'), s('doing','raided'), s('what','the coast') ],
      examples:["The Anglo-Saxons settled before the Vikings raided the coast.","The Anglo-Saxons settle before the Vikings raid the coast."] },
    { title:"Simple sentence with a fronted adverbial phrase", note:"how / where / when + comma + who + doing + what",
      pattern:[ s('when','In AD793'), comma(), s('who','the Vikings'), s('doing','raided'), s('what','Lindisfarne') ],
      examples:["In AD793, the Vikings raided Lindisfarne.","In AD793, the Vikings raid Lindisfarne."] },
    { title:"Complex sentence", note:"Moving the subordinate clause to the beginning of the sentence",
      pattern:[ s('subord','As',{options:['As','Before','After','Although']}), s('who','the switch'), s('doing','closes'), s('what','the circuit'), comma(), s('who','the bulb'), s('doing','lights') ],
      examples:["As the switch closes the circuit, the bulb lights.","As the switch closed the circuit, the bulb lit."] },
    { title:"Simple sentence with noun phrase expanded by additional nouns", note:"who + doing + what + what",
      pattern:[ s('who','The scientist'), s('doing','examines'), s('what','an arm'), s('what','bone') ],
      examples:["The scientist examines an arm bone.","The scientist examined an arm bone."] },
    { title:"Simple sentence with noun phrase expanded by a prepositional phrase", note:"who + doing + what + where",
      pattern:[ s('who','The boat'), s('doing','carries'), s('what','goods'), s('where','along the Thames') ],
      examples:["The boat carries goods along the Thames.","The boat carried goods along the Thames."] }
  ]
},
{
  id:'y5', label:'Year 5',
  intro:"Year 5 pupils widen their conjunction range further (for, unless, whenever, whereas), use adverbs of possibility, build modal-verb sentences, and learn to embed subordinate and relative clauses within a sentence — not just at the start or end.",
  structures:[
    { title:"Recap compound sentence", note:"Co-ordinating conjunctions from previous years → introduce 'for'",
      pattern:[ s('who','Boudicca'), s('doing','fought'), s('coord','for',{options:['for','and','but','so','or','yet']}), s('who','the Iceni'), s('aux','were',{options:['were','was']}), s('describe','angry') ],
      examples:["Boudicca fought for the Iceni were angry.","Boudicca fights for the Iceni are angry."] },
    { title:"Recap complex sentence", note:"Subordinating conjunctions from Y2-Y4 → introduce unless/whenever/whereas",
      pattern:[ s('who','Egyptians'), s('doing','celebrated'), s('subord','whenever',{options:['whenever','unless','whereas']}), s('who','a new pharaoh'), s('doing','took'), s('what','the throne') ],
      examples:["Egyptians celebrated whenever a new pharaoh took the throne.","Egyptians celebrate whenever a new pharaoh takes the throne."] },
    { title:"Simple sentence with an adverb for possibility", note:"who + linking verb + adverb + describe",
      pattern:[ s('who','The universe'), s('aux','is',{options:['is','was']}), s('how','truly'), s('describe','enormous') ],
      examples:["The universe is truly enormous.","The universe was truly enormous."] },
    { title:"Simple modal sentence", note:"who + modal verb + doing (+ what)",
      pattern:[ s('who','The pulley'), s('aux','might',{options:['might','can','could','may','must','shall','should','will','would']}), s('doing','lift'), s('what','the weight') ],
      examples:["The pulley might lift the weight.","The pulley might lift."] },
    { title:"Complex sentence", note:"Embed the subordinate clause within a sentence",
      pattern:[ s('who','The river'), comma(), s('subord','as',{options:['as']}), s('who','the current'), s('doing','carries'), s('what','sand'), comma(), s('doing','widens') ],
      examples:["The river, as the current carries sand, widens.","The river, as the current carried sand, widened."] },
    { title:"Complex sentence", note:"Embed a relative clause within a sentence",
      pattern:[ s('who','Tutankhamun'), comma(), s('relative','who was a young pharaoh'), comma(), s('doing','ruled'), s('what','Egypt') ],
      examples:["Tutankhamun, who was a young pharaoh, ruled Egypt.","Tutankhamun, who is a young pharaoh, rules Egypt."] },
    { title:"Complex sentence", note:"Include a relative clause at the end of the sentence",
      pattern:[ s('who','The Romans'), s('doing','built'), s('what','the wall'), s('relative','that protected the empire') ],
      examples:["The Romans built the wall that protected the empire.","The Romans build the wall that protects the empire."] }
  ]
},
{
  id:'y6', label:'Year 6',
  intro:"Year 6 pupils consolidate and refine advanced sentence structures: a final widening of subordinating conjunctions (in order to, provided that, supposing), and the passive voice, where the subject becomes the recipient of the action rather than the one doing it.",
  structures:[
    { title:"Recap complex sentence", note:"Subordinating conjunctions from Y2-Y5 → introduce in order to/provided that/supposing",
      pattern:[ s('who','Alexander'), s('doing','conquered'), s('subord','provided that',{options:['provided that','in order to','supposing']}), s('who','the army'), s('doing','followed'), s('what','the plan') ],
      examples:["Alexander conquered provided that the army followed the plan.","Alexander conquers provided that the army follows the plan."] },
    { title:"Simple passive sentence", note:"The object of the active sentence becomes the subject: what (as agent) + is/was + doing (past participle) + by + who",
      pattern:[ s('what','The animal'), s('aux','is',{options:['is','was']}), s('doing','classified'), lit('by'), s('who','the scientist') ],
      examples:["The animal is classified by the scientist.","The animal was classified by the scientist."] }
  ]
}
];

/* ---------- Key strip render ---------- */;
})();
