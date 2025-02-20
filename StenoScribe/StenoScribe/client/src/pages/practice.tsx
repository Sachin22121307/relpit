import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { calculateWPM, calculateAccuracy, compareWords } from "@/lib/utils/wordComparison";
import type { Passage } from "@shared/schema";

export default function Practice() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [typedText, setTypedText] = useState("");
  const [highlightedText, setHighlightedText] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("600"); // 10 minutes default
  const [timeRemaining, setTimeRemaining] = useState(600);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  const { data: passage, isLoading } = useQuery<Passage>({
    queryKey: [`/api/passages/${id}`]
  });

  useEffect(() => {
    if (!isStarted) {
      setTimeRemaining(parseInt(selectedDuration));
    }
  }, [selectedDuration, isStarted]);

  useEffect(() => {
    if (isStarted && !isFinished && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isStarted, isFinished]);

  // Highlight errors in real-time
  useEffect(() => {
    if (passage && typedText) {
      const words = passage.content.split(" ");
      const typedWords = typedText.split(" ");
      let highlighted = "";

      typedWords.forEach((word, index) => {
        if (index >= words.length) {
          highlighted += `<span class="text-red-500">${word} </span>`;
        } else if (word === words[index]) {
          highlighted += `<span class="text-green-500">${word} </span>`;
        } else if (word.toLowerCase() === words[index].toLowerCase()) {
          highlighted += `<span class="text-yellow-500">${word} </span>`;
        } else {
          highlighted += `<span class="text-red-500">${word} </span>`;
        }
      });

      setHighlightedText(highlighted);
    }
  }, [typedText, passage]);

  const submitTest = useMutation({
    mutationFn: async () => {
      if (!passage) return;
      const duration = parseInt(selectedDuration) - timeRemaining;
      const wpm = calculateWPM(typedText, duration);
      const accuracy = calculateAccuracy(passage.content, typedText);
      const mistakes = compareWords(passage.content, typedText);

      const res = await apiRequest("POST", "/api/results", {
        passageId: passage.id,
        typedContent: typedText,
        duration,
        wpm,
        accuracy,
        mistakes
      });
      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      if (!data) return;
      toast({
        title: "Test completed",
        description: "Redirecting to results..."
      });
      setLocation(`/results/${data.id}`);
    },
    onError: (error) => {
      console.error("Error submitting test:", error);
      toast({
        title: "Error",
        description: "Failed to submit test. Please try again.",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!passage) {
    return <div>Passage not found</div>;
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{passage.title}</h2>
            <div className="flex items-center gap-4">
              {!isStarted && (
                <Select
                  value={selectedDuration}
                  onValueChange={setSelectedDuration}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 8 }, (_, i) => (i + 1) * 10).map(
                      (minutes) => (
                        <SelectItem
                          key={minutes}
                          value={(minutes * 60).toString()}
                        >
                          {minutes} minutes
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
              <div className="text-xl font-mono">
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>

          {!isStarted ? (
            <div className="text-center py-8">
              <Button onClick={() => setIsStarted(true)} size="lg">
                Start Test
              </Button>
            </div>
          ) : (
            <>
              {!isFinished && (
                <div className="mb-4">
                  <p className="text-lg mb-4">{passage.content}</p>
                </div>
              )}
              <div className="mb-4 min-h-[100px] p-4 border rounded-md">
                <div 
                  dangerouslySetInnerHTML={{ __html: highlightedText }} 
                  className="mb-4"
                />
              </div>
              <Textarea
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="Start typing here..."
                rows={10}
                disabled={isFinished}
                className="mb-4"
              />
              <div className="flex justify-end gap-4">
                <Button
                  variant="secondary"
                  onClick={() => setLocation("/")}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setIsFinished(true);
                    clearInterval(timerRef.current);
                    submitTest.mutate();
                  }}
                  disabled={submitTest.isPending || !typedText.length}
                >
                  Submit
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}