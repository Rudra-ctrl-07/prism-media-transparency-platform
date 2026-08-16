declare module 'compromise' {
  interface NlpDoc {
    places(): { output: (format: string) => any; out: (format: string) => any };
    people(): { output: (format: string) => any; out: (format: string) => any };
    organizations(): { output: (format: string) => any; out: (format: string) => any };
    nouns(): { output: (format: string) => any; out: (format: string) => any };
    nounPhrases(): { output: (format: string) => any; out: (format: string) => any };
    terms(): { out: (format: string) => any };
    match(pattern: string): NlpDoc;
    sentiment(): { score: number; comparative: number };
  }

  interface Nlp {
    (text: string): NlpDoc;
  }

  const nlp: Nlp;
  export default nlp;
}