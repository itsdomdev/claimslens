export interface ExamplePost {
  label: string
  text: string
  emoji: string
}

export const EXAMPLE_POSTS: ExamplePost[] = [
  {
    label: 'Political tweet',
    emoji: '\uD83C\uDFDB\uFE0F',
    text: `BREAKING: Crime is up 200% in major cities!!! The government REFUSES to act. Studies show that experts agree the situation is dire. Either we demand change NOW or accept total chaos. Wake up people.`,
  },
  {
    label: 'LinkedIn hustle post',
    emoji: '\uD83D\uDCBC',
    text: `I quit my $300k job at Google. Everyone called me crazy. 6 months later I'm making $1M/year from my course. Smart people like you already know the 9-5 is dead. I personally helped 10,000 people escape the rat race. DM me "FREEDOM" for my exclusive free masterclass (only 50 spots left).`,
  },
  {
    label: 'Health claim',
    emoji: '\uD83C\uDF3F',
    text: `Studies show that natural immunity is 13x more effective than vaccines. Some experts believe Big Pharma is hiding this data. My grandmother cured her cancer with turmeric and positive thinking. Do your own research - the truth is out there.`,
  },
]
