import type { Request, Response } from "express";
import createHttpError from "http-errors";

import prisma from "../../prisma/client.ts";
import type { Prisma } from "../../generated/prisma/client.ts";
import { publicUserSelect } from "./auth.controller.ts";
import { PER_PAGE, type ListQuery } from "../validators/announcements.validator.ts";

// Fields returned for every announcement, with the author's public data (never the password)
const announcementSelect = {
  id: true,
  title: true,
  description: true,
  price: true,
  category: true,
  createdAt: true,
  updatedAt: true,
  user: { select: publicUserSelect },
} as const;

// GET /announcements (public)
export async function getAnnouncements(req: Request, res: Response) {
  // Already validated and coerced by validateQuery (page is a number, sort has a default)
  const { search, sort, page } = req.query as unknown as ListQuery;

  // Case-insensitive substring search in title; no filter when search is missing or empty
  const where: Prisma.AnnouncementWhereInput = search
    ? { title: { contains: search, mode: "insensitive" } }
    : {};

  const direction = sort === "oldest" ? "asc" : "desc";

  // Same `where` for findMany and count, so pagination matches the filtered results.
  // Secondary sort by id keeps the order stable when createdAt values are equal.
  const [data, total] = await prisma.$transaction([
    prisma.announcement.findMany({
      where,
      select: announcementSelect,
      orderBy: [{ createdAt: direction }, { id: direction }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.announcement.count({ where }),
  ]);

  res.json({
    data,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / PER_PAGE),
      perPage: PER_PAGE,
    },
  });
}

// GET /announcements/:id (public)
export async function getAnnouncementById(req: Request, res: Response) {
  const id = Number(req.params.id);

  const announcement = await prisma.announcement.findUnique({
    where: { id },
    select: announcementSelect,
  });

  // findUnique returns null (does not throw) when nothing is found, so we return 404 ourselves
  if (!announcement) {
    throw createHttpError(404, "Announcement not found");
  }

  res.json(announcement);
}
