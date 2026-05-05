<!--
  Grammar spine. Each block is one entry. Frontmatter fields:
    id, type, jp, reading, en, pos, jlpt, tags, faces
  faces must be a subset of [recall, cloze]. Cloze entries also require
  cloze_sentence (with `{}` blank marker) and cloze_target.
  Parsed at build time by src/content/spine/parser.ts.
-->
---
id: g-desu
type: grammar
jp: です
reading: desu
en: copula "is / am / are" (polite)
pos: grammar
jlpt: N5
tags: [copula, particle]
faces: [recall, cloze]
cloze_sentence: 私は学生{}。
cloze_target: です
---

---
id: g-wa-topic
type: grammar
jp: は
reading: wa
en: topic particle
pos: grammar
jlpt: N5
tags: [particle, topic]
faces: [recall, cloze]
cloze_sentence: 私{}日本人です。
cloze_target: は
---

---
id: g-ka-question
type: grammar
jp: か
reading: ka
en: question-marking particle (sentence-final)
pos: grammar
jlpt: N5
tags: [particle, question]
faces: [recall, cloze]
cloze_sentence: あなたは学生です{}。
cloze_target: か
---

---
id: g-no-possessive
type: grammar
jp: の
reading: no
en: possessive / modifier particle
pos: grammar
jlpt: N5
tags: [particle, possessive]
faces: [recall, cloze]
cloze_sentence: 私{}本です。
cloze_target: の
---

---
id: g-mo-also
type: grammar
jp: も
reading: mo
en: also / too (replaces は or を)
pos: grammar
jlpt: N5
tags: [particle, inclusion]
faces: [recall, cloze]
cloze_sentence: 私{}学生です。
cloze_target: も
---

---
id: g-ni-time
type: grammar
jp: に
reading: ni
en: at / on (time particle)
pos: grammar
jlpt: N5
tags: [particle, time]
faces: [recall, cloze]
cloze_sentence: 七時{}起きます。
cloze_target: に
---

---
id: g-ni-direction
type: grammar
jp: に
reading: ni
en: to (destination, with arrival verbs)
pos: grammar
jlpt: N5
tags: [particle, direction]
faces: [recall, cloze]
cloze_sentence: 学校{}行きます。
cloze_target: に
---

---
id: g-de-means
type: grammar
jp: で
reading: de
en: by means of / using (instrument)
pos: grammar
jlpt: N5
tags: [particle, means]
faces: [recall, cloze]
cloze_sentence: バス{}行きます。
cloze_target: で
---

---
id: g-de-location
type: grammar
jp: で
reading: de
en: at / in (location of an action)
pos: grammar
jlpt: N5
tags: [particle, location]
faces: [recall, cloze]
cloze_sentence: 図書館{}勉強します。
cloze_target: で
---

---
id: g-wo-object
type: grammar
jp: を
reading: o
en: direct-object particle
pos: grammar
jlpt: N5
tags: [particle, object]
faces: [recall, cloze]
cloze_sentence: りんご{}食べます。
cloze_target: を
---

---
id: g-e-direction
type: grammar
jp: へ
reading: e
en: toward (direction particle)
pos: grammar
jlpt: N5
tags: [particle, direction]
faces: [recall, cloze]
cloze_sentence: 東京{}行きます。
cloze_target: へ
---

---
id: g-to-with
type: grammar
jp: と
reading: to
en: with (a companion)
pos: grammar
jlpt: N5
tags: [particle, companion]
faces: [recall, cloze]
cloze_sentence: 友達{}話します。
cloze_target: と
---

---
id: g-ga-subject
type: grammar
jp: が
reading: ga
en: subject-marking particle
pos: grammar
jlpt: N5
tags: [particle, subject]
faces: [recall, cloze]
cloze_sentence: 猫{}います。
cloze_target: が
---

---
id: g-arimasu
type: grammar
jp: あります
reading: arimasu
en: there is / exists (inanimate)
pos: grammar
jlpt: N5
tags: [verb, existence]
faces: [recall, cloze]
cloze_sentence: 机の上に本が{}。
cloze_target: あります
---

---
id: g-imasu
type: grammar
jp: います
reading: imasu
en: there is / exists (animate)
pos: grammar
jlpt: N5
tags: [verb, existence]
faces: [recall, cloze]
cloze_sentence: 部屋に猫が{}。
cloze_target: います
---

---
id: g-masu
type: grammar
jp: ～ます
reading: masu
en: polite non-past verb ending
pos: grammar
jlpt: N5
tags: [verb, polite]
faces: [recall, cloze]
cloze_sentence: 毎日コーヒーを飲み{}。
cloze_target: ます
---

---
id: g-masen
type: grammar
jp: ～ません
reading: masen
en: polite negative verb ending
pos: grammar
jlpt: N5
tags: [verb, negative]
faces: [recall, cloze]
cloze_sentence: 肉は食べ{}。
cloze_target: ません
---

---
id: g-mashita
type: grammar
jp: ～ました
reading: mashita
en: polite past verb ending
pos: grammar
jlpt: N5
tags: [verb, past]
faces: [recall, cloze]
cloze_sentence: 昨日映画を見{}。
cloze_target: ました
---

---
id: g-masen-deshita
type: grammar
jp: ～ませんでした
reading: masen deshita
en: polite past negative verb ending
pos: grammar
jlpt: N5
tags: [verb, past, negative]
faces: [recall, cloze]
cloze_sentence: 昨日学校に行き{}。
cloze_target: ませんでした
---

---
id: g-ja-arimasen
type: grammar
jp: じゃありません
reading: ja arimasen
en: is not (polite negative copula)
pos: grammar
jlpt: N5
tags: [copula, negative]
faces: [recall, cloze]
cloze_sentence: 私は学生{}。
cloze_target: じゃありません
---

---
id: g-deshita
type: grammar
jp: でした
reading: deshita
en: was / were (polite past copula)
pos: grammar
jlpt: N5
tags: [copula, past]
faces: [recall, cloze]
cloze_sentence: 昨日は雨{}。
cloze_target: でした
---

---
id: g-te-form
type: grammar
jp: ～て
reading: te
en: te-form, links clauses or carries further endings
pos: grammar
jlpt: N5
tags: [verb, te-form]
faces: [recall, cloze]
cloze_sentence: ご飯を食べ{}、寝ます。
cloze_target: て
---

---
id: g-te-kudasai
type: grammar
jp: ～てください
reading: te kudasai
en: please do (polite request)
pos: grammar
jlpt: N5
tags: [verb, request]
faces: [recall, cloze]
cloze_sentence: 名前を書いて{}。
cloze_target: ください
---

---
id: g-te-imasu
type: grammar
jp: ～ています
reading: te imasu
en: progressive / ongoing state
pos: grammar
jlpt: N5
tags: [verb, progressive]
faces: [recall, cloze]
cloze_sentence: 今、本を読んで{}。
cloze_target: います
---

---
id: g-tai
type: grammar
jp: ～たい
reading: tai
en: want to (verb desire form)
pos: grammar
jlpt: N5
tags: [verb, desire]
faces: [recall, cloze]
cloze_sentence: 水が飲み{}です。
cloze_target: たい
---

---
id: g-i-adj
type: grammar
jp: ～い
reading: i-keiyoushi
en: i-adjective ending
pos: grammar
jlpt: N5
tags: [adjective]
faces: [recall, cloze]
cloze_sentence: この本は面白{}です。
cloze_target: い
---

---
id: g-na-adj
type: grammar
jp: ～な
reading: na-keiyoushi
en: na-adjective linker before a noun
pos: grammar
jlpt: N5
tags: [adjective]
faces: [recall, cloze]
cloze_sentence: きれい{}花です。
cloze_target: な
---

---
id: g-kara-because
type: grammar
jp: から
reading: kara
en: because (reason conjunction)
pos: grammar
jlpt: N5
tags: [conjunction, reason]
faces: [recall, cloze]
cloze_sentence: 寒いです{}、上着を着ます。
cloze_target: から
---

---
id: g-ga-but
type: grammar
jp: が
reading: ga
en: but (clause-linking conjunction)
pos: grammar
jlpt: N5
tags: [conjunction, contrast]
faces: [recall, cloze]
cloze_sentence: 高いです{}、買います。
cloze_target: が
---

---
id: g-ne
type: grammar
jp: ね
reading: ne
en: confirmation / agreement-seeking particle
pos: grammar
jlpt: N5
tags: [particle, sentence-final]
faces: [recall, cloze]
cloze_sentence: いい天気です{}。
cloze_target: ね
---
