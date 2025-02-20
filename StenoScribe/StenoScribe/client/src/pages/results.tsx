import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import type { TestResult, Passage, WordMistakes } from "@shared/schema";

export default function Results() {
  const { resultId } = useParams();

  const { data: result, isLoading: resultLoading } = useQuery<TestResult>({
    queryKey: [`/api/results/${resultId}`],
    retry: 1
  });

  const { data: passage, isLoading: passageLoading } = useQuery<Passage>({
    queryKey: [`/api/passages/${result?.passageId}`],
    enabled: !!result?.passageId
  });

  if (resultLoading || passageLoading) {
    return <div className="container mx-auto p-6">Loading results...</div>;
  }

  if (!result || !passage) {
    return (
      <div className="container mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Result not found</h2>
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </div>
    );
  }

  const mistakes = result.mistakes as WordMistakes;
  const mistakeTypes = ['missed', 'wrong', 'misspelled'] as const;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Test Results</h1>
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Words per Minute:</span>
                <span className="font-bold">{result.wpm}</span>
              </div>
              <div className="flex justify-between">
                <span>Accuracy:</span>
                <span className="font-bold">{result.accuracy}%</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-bold">
                  {Math.floor(result.duration / 60)}m {result.duration % 60}s
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mistakeTypes.map((type) => (
                <div key={type} className="flex justify-between">
                  <span className="capitalize">{type} Words:</span>
                  <span className={`font-bold text-${
                    type === 'missed' ? 'red' : 
                    type === 'wrong' ? 'orange' : 
                    'yellow'}-500`}
                  >
                    {mistakes[type].length}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Text Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Original Text</h3>
              <ScrollArea className="h-[200px] rounded-md border p-4">
                {passage.content}
              </ScrollArea>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Your Text</h3>
              <ScrollArea className="h-[200px] rounded-md border p-4">
                {result.typedContent}
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mistakes Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {mistakeTypes.map((type) => (
              <div key={type}>
                <h3 className="font-semibold mb-2 capitalize">
                  {type} Words
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sl No</TableHead>
                      <TableHead>Word</TableHead>
                      <TableHead>Occurrence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mistakes[type].map((word, index) => {
                      const count = mistakes[type].filter((w: string) => w === word).length;
                      // Only show unique words with their count
                      if (mistakes[type].indexOf(word) === index) {
                        return (
                          <TableRow key={`${type}-${word}-${index}`}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className={`text-${
                              type === 'missed' ? 'red' : 
                              type === 'wrong' ? 'orange' : 
                              'yellow'}-500`}
                            >
                              {word}
                            </TableCell>
                            <TableCell>{count}</TableCell>
                          </TableRow>
                        );
                      }
                      return null;
                    }).filter(Boolean)}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}