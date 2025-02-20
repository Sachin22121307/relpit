import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Passage, PassageStats, WordFrequency } from "@shared/schema";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [openPassageId, setOpenPassageId] = useState<number | null>(null);

  const { data: passages, isLoading: passagesLoading } = useQuery<Passage[]>({
    queryKey: ["/api/passages"]
  });

  const { data: masterErrorList } = useQuery<WordFrequency[]>({
    queryKey: ["/api/master-errors"]
  });

  const { data: passageStats, isLoading: statsLoading } = useQuery<PassageStats>({
    queryKey: ["/api/passages", openPassageId, "stats"],
    enabled: openPassageId !== null
  });

  const createPassage = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/passages", { title, content });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Passage created successfully"
      });
      setTitle("");
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/passages"] });
    }
  });

  const deletePassage = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/passages/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Passage deleted successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/passages"] });
    }
  });

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8 text-center">
        Stenography Practice Platform
      </h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add New Passage</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPassage.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Input
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Textarea
                  placeholder="Passage content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                />
              </div>
              <Button type="submit" disabled={createPassage.isPending}>
                Add Passage
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Passages</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {passagesLoading ? (
                <div>Loading passages...</div>
              ) : passages?.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  No passages available
                </div>
              ) : (
                <div className="space-y-4">
                  {passages?.map((passage) => (
                    <Collapsible
                      key={passage.id}
                      open={openPassageId === passage.id}
                      onOpenChange={() =>
                        setOpenPassageId(
                          openPassageId === passage.id ? null : passage.id
                        )
                      }
                    >
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="font-semibold">{passage.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {passage.content.substring(0, 100)}...
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => setLocation(`/practice/${passage.id}`)}
                                variant="secondary"
                                size="sm"
                              >
                                Practice
                              </Button>
                              <Button
                                onClick={() => deletePassage.mutate(passage.id)}
                                variant="destructive"
                                size="sm"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  {openPassageId === passage.id ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                          </div>
                          <CollapsibleContent>
                            {statsLoading ? (
                              <div className="py-4 text-center">Loading stats...</div>
                            ) : !passageStats ? (
                              <div className="py-4 text-center">No stats available</div>
                            ) : (
                              <div className="space-y-4 mt-4">
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <p className="text-sm font-medium">Total Attempts</p>
                                    <p className="text-2xl font-bold">
                                      {passageStats.totalAttempts}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Average WPM</p>
                                    <p className="text-2xl font-bold">
                                      {passageStats.averageWPM}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Average Accuracy</p>
                                    <p className="text-2xl font-bold">
                                      {passageStats.averageAccuracy}%
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold mb-2">
                                    Frequent Mistakes
                                  </h4>
                                  {passageStats.frequentMistakes.length > 0 ? (
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Sl No</TableHead>
                                          <TableHead>Word</TableHead>
                                          <TableHead>Frequency</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {passageStats.frequentMistakes.map(
                                          (mistake, index) => (
                                            <TableRow key={mistake.word}>
                                              <TableCell>{index + 1}</TableCell>
                                              <TableCell>{mistake.word}</TableCell>
                                              <TableCell>{mistake.frequency}</TableCell>
                                            </TableRow>
                                          )
                                        )}
                                      </TableBody>
                                    </Table>
                                  ) : (
                                    <div className="text-center text-muted-foreground py-2">
                                      No mistakes recorded yet
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </CollapsibleContent>
                        </CardContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Master Error List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {["missed", "wrong", "misspelled"].map((type) => (
                <div key={type}>
                  <h3 className="text-lg font-semibold capitalize mb-4">{type} Words</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sl No</TableHead>
                        <TableHead>Word</TableHead>
                        <TableHead>Total Frequency</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {masterErrorList
                        ?.filter(error => error.type === type)
                        .map((error, index) => (
                          <TableRow key={`${error.word}-${error.type}`}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{error.word}</TableCell>
                            <TableCell>{error.frequency}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}