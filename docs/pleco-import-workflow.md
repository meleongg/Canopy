# Pleco export workflow

Canopy supports a learner-controlled import from Pleco's flashcard text
export. This is the supported acquisition workflow for the private beta.

## In Pleco

1. In **Flashcards**, choose **Export Cards**.
2. Choose **Text File**, set the text encoding to **UTF-8**, and enable
   **Categories** if you want the export to retain Pleco's grouping in the file.
3. Export all cards, selected categories, or a search result, then transfer the
   `.txt` file using the device's normal file-sharing flow.

Pleco text exports contain category header lines beginning with `//`, followed
by tab-delimited card rows:

```text
//Textbook/Chapter 3
福利\tfu2li4\tmaterial benefit; welfare
```

Each card row may include a headword, pronunciation, and definition. Definitions
depend on Pleco's export options and the dictionaries used for the source cards.
For Chinese exports, Canopy also preserves Pleco's inline Chinese example
sentences, readings, and translations as editable contexts; numbered pinyin is
normalized to tone-mark pinyin.

## In Canopy

1. Open **Dashboard** and choose **Import vocabulary**.
2. Select the language, upload the exported `.txt` file, and choose **Preview
   flashcards**.
3. Review or edit the cards, then create the cards you want to keep.

Canopy ignores Pleco category header lines. Categories are useful for selecting
what to export in Pleco, but Canopy deliberately does not import them as decks
or other learner-facing grouping: those features are out of scope for the
private beta. The import preview remains the confirmation point before any
cards are created.

## Decision: no automated cloud-folder sync

Do not build cloud-folder polling or sync for this beta. Pleco's official
documentation describes exporting a file and transferring it through ordinary
file-sharing methods, but does not document a server API, webhook, or
unattended recent-search export. A user-uploaded UTF-8 text file is reliable,
explicitly authorized, and already compatible with Canopy's preview-and-import
flow.

Revisit a user-authorized cloud-folder import only if beta usage shows that
manual uploads are a recurring friction point and a supported provider
integration is worth its authorization, privacy, and operational cost.

## References

- [Pleco Android Flashcards Reference](https://android.pleco.com/manual/240/flash.html)
- [Pleco iPhone Flashcards Tutorial](https://iphone.pleco.com/manual/30200/flashtut.html)
