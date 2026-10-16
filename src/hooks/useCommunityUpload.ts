"use client";
import { useMutation } from "@tanstack/react-query";
import { communityRepository } from "@/lib/repo/community";
export function useCommunityUpload() { return useMutation({ mutationFn: (file: File) => communityRepository.upload(file) }); }
