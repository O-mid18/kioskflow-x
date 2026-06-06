import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const products = body.products || [];

    const recommendations = products.slice(0, 3);

    return NextResponse.json({
      recommendations,
      reasoning: "Popular products",
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error: error?.message || "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}