"use client";

import { DictionaryExplorerView } from "@/app/explore/dictionary-explorer-view";
import { ExploreChinesePracticeView } from "@/app/explore/explore-chinese-practice-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ExploreView() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8">
      <Tabs defaultValue="dictionary">
        <TabsList aria-label="Explore Chinese">
          <TabsTrigger value="dictionary">Dictionary</TabsTrigger>
          <TabsTrigger value="practice">Practice</TabsTrigger>
        </TabsList>
        <TabsContent value="dictionary">
          <DictionaryExplorerView />
        </TabsContent>
        <TabsContent value="practice">
          <ExploreChinesePracticeView />
        </TabsContent>
      </Tabs>
    </main>
  );
}
