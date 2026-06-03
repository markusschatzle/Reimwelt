SELECT id, word, language, pos, gender,
       ipa_raw, ipa, ipa_source,
       rhyme_part, stress_pattern, meter, syllable_count,
       hyphenation, round(frequency_score::numeric, 8) AS frequency_score,
       is_inflected_form, is_multiword, is_abbreviation, is_ghost_word,
       audio_url,
       left(etymology,120) AS etymology,
       definitions::text,
       synonyms::text,
       left(inflections::text,200) AS inflections
FROM words
WHERE language = 'de'
  AND word IN ('Haus', 'laufen', 'sch' + [char]0xF6 + 'n', 'Freiheit', 'Wasser', 'dunkel')
ORDER BY word, pos;