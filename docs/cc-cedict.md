# CC-CEDICT lookup data

Canopy uses CC-CEDICT only as shared Chinese-English lookup data. It is not a
learner card import: the corpus belongs in `dictionary_releases` and
`dictionary_entries`, while each learner's cards remain in `words` and
`flashcards`.

## Source and attribution

Download the UTF-8 `.txt.gz` release manually from the
[CC-CEDICT download page](https://www.mdbg.net/chinese/dictionary?page=cc-cedict).
Do not automate or schedule requests to that page. The download is licensed
under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

Canopy's public attribution is available at `/attributions`. Keep the release
timestamp, published entry count, source URL, license URL, and SHA-256 digest
recorded by the importer whenever updating the corpus.

## Local import

First apply the local schema update:

```bash
npm run db:push
```

Then pass the manually downloaded file and the timestamp and count displayed
on the download page to the importer:

```bash
npm run dictionary:import -- ~/Downloads/cedict_1_0_ts_utf-8_mdbg.txt.gz \
  --released-at "2026-08-16T08:48:37Z" \
  --entry-count 124866
```

The importer validates the parsed count before writes, computes a SHA-256
digest for the downloaded artifact, and upserts rows in bounded batches. It
does not download data or create learner flashcards.
