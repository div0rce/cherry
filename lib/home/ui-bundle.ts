export type HomeUiBundle = {
  hasLiveData: false;
};

export async function getHomeUiBundle(_userId: string): Promise<HomeUiBundle> {
  return { hasLiveData: false };
}
