
"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchCollectionData } from "@/app/actions"; // Server action
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, DatabaseZap, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const KNOWN_COLLECTIONS = ["users", "patients", "nurses", "videoConsults"];

export default function DataViewerPage() {
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [collectionData, setCollectionData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFetchData = () => {
    if (!selectedCollection) {
      setError("Please select a collection to view.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setCollectionData(null);

    startTransition(async () => {
      const result = await fetchCollectionData(selectedCollection);
      if (result.data) {
        setCollectionData(result.data);
      } else {
        setError(result.error || "Failed to fetch collection data.");
      }
      setIsLoading(false);
    });
  };

  const tableHeaders = useMemo(() => {
    if (!collectionData || collectionData.length === 0) {
      return [];
    }
    // Get all unique keys from all documents to form headers
    const allKeys = new Set<string>();
    collectionData.forEach(doc => {
      Object.keys(doc).forEach(key => allKeys.add(key));
    });
    // Ensure 'id' is first if it exists
    const sortedKeys = Array.from(allKeys);
    if (sortedKeys.includes('id')) {
        return ['id', ...sortedKeys.filter(key => key !== 'id')];
    }
    return sortedKeys;
  }, [collectionData]);

  const renderCellContent = (content: any) => {
    if (typeof content === 'object' && content !== null) {
      return JSON.stringify(content);
    }
    if (typeof content === 'boolean') {
      return content.toString();
    }
    return content;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DatabaseZap className="mr-2 h-5 w-5 text-primary" />
            Firestore Data Viewer (Dev Tool)
          </CardTitle>
          <CardDescription>
            Select a collection to view its documents. Shows up to 25 documents.
            This is a developer tool and should not be exposed in production.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-grow">
              <label htmlFor="collection-select" className="text-sm font-medium mb-1 block">
                Select Collection
              </label>
              <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                <SelectTrigger id="collection-select">
                  <SelectValue placeholder="Choose a collection..." />
                </SelectTrigger>
                <SelectContent>
                  {KNOWN_COLLECTIONS.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleFetchData} disabled={isLoading || isPending || !selectedCollection}>
              {isLoading || isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Fetch Data
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {collectionData && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Documents in "{selectedCollection}"</CardTitle>
                <CardDescription>
                  {collectionData.length === 0
                    ? "No documents found in this collection."
                    : `Displaying ${collectionData.length} document(s). Max 25 shown.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] w-full rounded-md border p-0 bg-muted/20">
                  {collectionData.length > 0 && tableHeaders.length > 0 ? (
                    <Table className="min-w-full">
                      <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                        <TableRow>
                          {tableHeaders.map((header) => (
                            <TableHead key={header} className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm">
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {collectionData.map((doc, index) => (
                          <TableRow key={doc.id || index}>
                            {tableHeaders.map((header) => (
                              <TableCell key={`${doc.id || index}-${header}`} className="px-3 py-2 text-xs align-top">
                                <div className="max-w-xs truncate" title={typeof doc[header] === 'object' ? JSON.stringify(doc[header]) : String(doc[header])}>
                                  {renderCellContent(doc[header])}
                                </div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                     <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                        <DatabaseZap className="h-12 w-12 mb-2"/>
                        <p>No documents to display or no data to form table.</p>
                     </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
