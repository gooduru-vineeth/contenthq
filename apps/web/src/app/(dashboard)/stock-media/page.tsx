"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import {
  Search,
  ImageIcon,
  Film,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Camera,
  Globe,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

type MediaType = "image" | "video";
type Orientation = "all" | "portrait" | "landscape" | "square";

interface PreviewItem {
  id: string;
  name: string;
  url: string;
  previewUrl?: string;
  type: MediaType;
  width: number;
  height: number;
  photographer?: string;
  providerName: string;
  sourceUrl?: string;
  licenseType: string;
  attributionRequired: boolean;
  attributionText?: string;
  duration?: number;
}

export default function StockMediaPage() {
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [orientation, setOrientation] = useState<Orientation>("all");
  const [providerId, setProviderId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
  const perPage = 20;

  const { data: providers } = trpc.stockMedia.providers.useQuery({
    type: mediaType,
  });

  const isSearchMode = searchQuery.length > 0;

  const searchResult = trpc.stockMedia.search.useQuery(
    {
      query: searchQuery,
      type: mediaType,
      orientation: orientation !== "all" ? orientation : undefined,
      providerId: providerId !== "all" ? providerId : undefined,
      page,
      perPage,
    },
    { enabled: isSearchMode }
  );

  const curatedResult = trpc.stockMedia.curated.useQuery(
    {
      type: mediaType,
      orientation: orientation !== "all" ? orientation : undefined,
      providerId: providerId !== "all" ? providerId : undefined,
      page,
      perPage,
    },
    { enabled: !isSearchMode }
  );

  const activeResult = isSearchMode ? searchResult : curatedResult;
  const { data, isLoading } = activeResult;

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSearchQuery(query);
      setPage(1);
    },
    [query]
  );

  const handleTypeChange = useCallback((value: string) => {
    setMediaType(value as MediaType);
    setPage(1);
  }, []);

  const handleOrientationChange = useCallback((value: string) => {
    setOrientation(value as Orientation);
    setPage(1);
  }, []);

  const handleProviderChange = useCallback((value: string) => {
    setProviderId(value);
    setPage(1);
  }, []);

  const handleClearSearch = useCallback(() => {
    setQuery("");
    setSearchQuery("");
    setPage(1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock Media</h1>
        <p className="text-sm text-muted-foreground">
          Search free stock images and videos from Pexels, Unsplash, Pixabay,
          and Storyblocks
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search for images or videos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={!query.trim()}>
          Search
        </Button>
        {isSearchMode && (
          <Button type="button" variant="outline" onClick={handleClearSearch}>
            Clear
          </Button>
        )}
      </form>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type tabs */}
        <Tabs value={mediaType} onValueChange={handleTypeChange}>
          <TabsList>
            <TabsTrigger value="image" className="gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              Images
            </TabsTrigger>
            <TabsTrigger value="video" className="gap-1.5">
              <Film className="h-3.5 w-3.5" />
              Videos
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Orientation filter */}
        <Select value={orientation} onValueChange={handleOrientationChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Orientation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All orientations</SelectItem>
            <SelectItem value="landscape">Landscape</SelectItem>
            <SelectItem value="portrait">Portrait</SelectItem>
            <SelectItem value="square">Square</SelectItem>
          </SelectContent>
        </Select>

        {/* Provider filter */}
        <Select value={providerId} onValueChange={handleProviderChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            {providers?.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                {provider.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Result count */}
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.total.toLocaleString()} results
          </span>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <StockMediaGridSkeleton />
      ) : data && data.results.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {data.results.map((item) => (
              <Card
                key={item.id}
                className="group relative cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
                onClick={() => setPreviewItem(item)}
              >
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  {item.type === "image" ? (
                    <Image
                      src={item.thumbnailUrl || item.url}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                      unoptimized
                    />
                  ) : (
                    <div className="relative h-full w-full">
                      {item.thumbnailUrl ? (
                        <Image
                          src={item.thumbnailUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Film className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                      {item.duration != null && (
                        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          {formatDuration(item.duration)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Type badge */}
                  <Badge
                    className={cn(
                      "absolute left-1.5 top-1.5 text-[10px]",
                      item.type === "image"
                        ? "bg-blue-500 hover:bg-blue-500/80 text-white"
                        : "bg-purple-500 hover:bg-purple-500/80 text-white"
                    )}
                  >
                    {item.type}
                  </Badge>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button size="sm" variant="secondary" className="gap-1.5">
                      <Search className="h-3.5 w-3.5" />
                      Preview
                    </Button>
                  </div>
                </div>

                <CardContent className="space-y-0.5 p-2">
                  <p className="truncate text-xs font-medium">{item.name}</p>
                  <div className="flex items-center gap-1">
                    {item.photographer && (
                      <p className="truncate text-[10px] text-muted-foreground">
                        <Camera className="mr-0.5 inline h-2.5 w-2.5" />
                        {item.photographer}
                      </p>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {item.providerName}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <Globe className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            {isSearchMode
              ? `No ${mediaType}s found for "${searchQuery}"`
              : "No stock media available. Configure API keys in your .env file."}
          </p>
          {isSearchMode && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleClearSearch}
            >
              Clear search
            </Button>
          )}
        </div>
      )}

      {/* Preview dialog */}
      {previewItem && (
        <StockMediaPreviewDialog
          item={previewItem}
          open={!!previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}

function StockMediaPreviewDialog({
  item,
  open,
  onClose,
}: {
  item: PreviewItem;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Media preview */}
          <div className="relative overflow-hidden rounded-lg bg-muted">
            {item.type === "image" ? (
              <div className="relative aspect-video w-full">
                <Image
                  src={item.previewUrl || item.url}
                  alt={item.name}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <video
                src={item.previewUrl || item.url}
                controls
                className="aspect-video w-full"
                poster={item.previewUrl}
              />
            )}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Provider: </span>
              <span className="font-medium">{item.providerName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Type: </span>
              <span className="font-medium capitalize">{item.type}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Size: </span>
              <span className="font-medium">
                {item.width} x {item.height}
              </span>
            </div>
            {item.photographer && (
              <div>
                <span className="text-muted-foreground">Photographer: </span>
                <span className="font-medium">{item.photographer}</span>
              </div>
            )}
            {item.duration != null && (
              <div>
                <span className="text-muted-foreground">Duration: </span>
                <span className="font-medium">
                  {formatDuration(item.duration)}
                </span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">License: </span>
              <span className="font-medium">{item.licenseType}</span>
            </div>
            {item.attributionRequired && item.attributionText && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Attribution: </span>
                <span className="font-medium">{item.attributionText}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {item.sourceUrl && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  View on {item.providerName}
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StockMediaGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
